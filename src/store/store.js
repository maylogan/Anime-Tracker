import { create } from "zustand";
import { subscribeToAnimeEntries } from "../services/supabase";

const toTimestamp = (value) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const toNullableTimestamp = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getAudienceFloat = (value) => {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return null;
  return numericValue > 10 ? numericValue / 10 : numericValue;
};

export const sortAnimeEntries = (entries = [], sortBy = "latest") => {
  const items = [...entries];

  const byLatest = (a, b) =>
    toTimestamp(b.created_at) - toTimestamp(a.created_at);
  const byReleaseDate = (a, b) => {
    const aTime = toNullableTimestamp(a.release_date);
    const bTime = toNullableTimestamp(b.release_date);

    if (aTime === null && bTime === null) {
      return byLatest(a, b);
    }

    if (aTime === null) return 1;
    if (bTime === null) return -1;

    if (aTime !== bTime) return bTime - aTime;
    return byLatest(a, b);
  };
  const byAudienceRating = (a, b) => {
    const aValue = getAudienceFloat(a.audience_rating);
    const bValue = getAudienceFloat(b.audience_rating);
    const normalizedA = aValue === null ? Number.NEGATIVE_INFINITY : aValue;
    const normalizedB = bValue === null ? Number.NEGATIVE_INFINITY : bValue;
    return normalizedB - normalizedA;
  };
  const byUserRating = (a, b) => (b.rating || 0) - (a.rating || 0);
  const byTitleAsc = (a, b) =>
    (a.title || "").localeCompare(b.title || "", undefined, {
      sensitivity: "base",
      numeric: true,
    });
  const byTitleDesc = (a, b) => byTitleAsc(b, a);

  switch (sortBy) {
    case "releaseDate":
      return items.sort(byReleaseDate);
    case "audienceRating":
      return items.sort(byAudienceRating);
    case "userRating":
      return items.sort(byUserRating);
    case "titleAsc":
      return items.sort(byTitleAsc);
    case "titleDesc":
      return items.sort(byTitleDesc);
    case "latest":
    default:
      return items.sort(byLatest);
  }
};

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
  sortBy: "latest",
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
  setSortBy: (sortBy) => {
    set({ sortBy });
    get().filterEntries();
  },
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
      sortBy,
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

    set({
      filteredEntries: sortAnimeEntries(filtered, overrides.sortBy ?? sortBy),
    });
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
