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
  selectedYear: "All",
  minRating: 0,
  cardDensity: "superCondensed",

  setEntries: (entries) => set({ entries }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setMinRating: (rating) => set({ minRating: rating }),
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

  filterEntries: () => {
    const {
      entries,
      searchQuery,
      selectedStatus,
      selectedCategory,
      selectedYear,
      minRating,
    } = get();

    const filtered = entries.filter((entry) => {
      const matchesSearch = entry.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === "All" || entry.status === selectedStatus;
      const matchesCategory =
        selectedCategory === "All" ||
        entry.categories.includes(selectedCategory);
      const matchesRating = entry.rating >= minRating;
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
