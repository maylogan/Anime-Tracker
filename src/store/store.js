import { create } from "zustand";
import { subscribeToAnimeEntries } from "../services/supabase";

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

export const useAnimeStore = create((set, get) => ({
  entries: [],
  filteredEntries: [],
  isLoading: false,
  searchQuery: "",
  selectedStatus: "All",
  selectedCategory: "All",
  selectedCategories: [],
  selectedYear: "All",
  minRating: 0,
  minAudienceRating: 0,
  cardDensity: "superCondensed",

  setEntries: (entries) => set({ entries }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedCategories: (categories) =>
    set({ selectedCategories: categories }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setMinRating: (rating) => set({ minRating: rating }),
  setMinAudienceRating: (rating) => set({ minAudienceRating: rating }),
  setCardDensity: (cardDensity) => set({ cardDensity }),

  addEntry: (entry) => {
    const { entries } = get();
    set({ entries: [entry, ...entries] });
  },

  updateEntry: (id, updates) => {
    const { entries } = get();
    set({
      entries: entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  },

  deleteEntry: (id) => {
    const { entries } = get();
    set({ entries: entries.filter((e) => e.id !== id) });
  },

  filterEntries: (overrides = {}) => {
    const {
      entries,
      searchQuery,
      selectedStatus,
      selectedCategory,
      selectedCategories,
      selectedYear,
      minRating,
      minAudienceRating,
    } = get();

    const effectiveSearchQuery =
      typeof overrides === "string"
        ? overrides
        : (overrides.searchQuery ?? searchQuery);

    const normalizeStatus = (status) => {
      if (!status) return "";
      if (status === "Plan to Watch") return "Planned";
      return status;
    };

    const activeCategories = Array.isArray(selectedCategories)
      ? selectedCategories.filter((category) => category && category !== "All")
      : [];

    const filtered = entries.filter((entry) => {
      const entryStatus = normalizeStatus(entry.status);
      const matchesSearch = entry.title
        .toLowerCase()
        .includes(String(effectiveSearchQuery).toLowerCase());
      const matchesStatus =
        selectedStatus === "All" || entryStatus === selectedStatus;
      const entryCategories = entry.categories || [];
      const matchesCategory =
        activeCategories.length > 0
          ? activeCategories.some((category) =>
              entryCategories.includes(category),
            )
          : selectedCategory === "All" ||
            entryCategories.includes(selectedCategory);
      const matchesRating = (entry.rating || 0) >= minRating;

      const getAudienceFloat = (val) => {
        if (val === null || val === undefined) return null;
        const n = Number(val);
        if (Number.isNaN(n)) return null;
        return n > 10 ? n / 10 : n;
      };

      const entryAudience = getAudienceFloat(entry.audience_rating);
      const matchesAudienceRating =
        minAudienceRating <= 0 ||
        (entryAudience !== null && entryAudience >= minAudienceRating);
      const matchesYear =
        selectedYear === "All" ||
        (entry.release_date &&
          new Date(entry.release_date).getFullYear().toString() ===
            selectedYear);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesRating &&
        matchesAudienceRating &&
        matchesYear
      );
    });

    set({ filteredEntries: filtered });
  },

  setupRealtimeListener: (userId) => {
    try {
      subscribeToAnimeEntries(userId, (payload) => {
        try {
          // Payload structure: { eventType, new, old, errors }
          const { eventType, new: newData, old: oldData } = payload;

          if (eventType === "INSERT" && newData) {
            get().addEntry(newData);
          } else if (eventType === "UPDATE" && newData) {
            get().updateEntry(newData.id, newData);
          } else if (eventType === "DELETE" && oldData) {
            get().deleteEntry(oldData.id);
          }
        } catch (err) {
          console.error("Error processing real-time update:", err);
        }
      });
    } catch (err) {
      console.error("Error setting up real-time listener:", err);
    }
  },
}));

export const useUIStore = create((set) => ({
  isAddModalOpen: false,
  isEditModalOpen: false,
  editingEntryId: null,

  openAddModal: () => set({ isAddModalOpen: true }),
  closeAddModal: () => set({ isAddModalOpen: false }),
  openEditModal: (id) => set({ isEditModalOpen: true, editingEntryId: id }),
  closeEditModal: () => set({ isEditModalOpen: false, editingEntryId: null }),
}));
