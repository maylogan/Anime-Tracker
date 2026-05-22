import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAnimeStore } from "../store/store";

const ratingOptions = [
  { label: "Any Rating", value: 0 },
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `${index + 1}/10 & up`,
    value: index + 1,
  })),
];

const statusOptions = [
  "All Statuses",
  "Watching",
  "Completed",
  "Planned",
  "Dropped",
  "On Hold",
];

const normalizeArray = (values) =>
  Array.from(new Set((values || []).filter(Boolean)));

export const FilterBar = ({
  allCategories = [],
  allYears = [],
  onAddAnime,
  showAddButton = true,
  showCardDensity = true,
  searchPlaceholder = "Search your anime list...",
  filters,
}) => {
  const storeFilters = useAnimeStore();
  const resolvedFilters = { ...storeFilters, ...(filters || {}) };
  const filterEntries = !filters
    ? storeFilters.filterEntries
    : typeof filters.filterEntries === "function"
      ? filters.filterEntries
      : undefined;

  const {
    searchQuery = "",
    selectedStatus = "All",
    selectedCategory = "All",
    selectedCategories = [],
    selectedYear = "All",
    minRating = 0,
    minAudienceRating = 0,
    cardDensity = "superCondensed",
    setSearchQuery = storeFilters.setSearchQuery,
    setSelectedStatus = storeFilters.setSelectedStatus,
    setSelectedCategory = storeFilters.setSelectedCategory,
    setSelectedCategories = storeFilters.setSelectedCategories,
    setSelectedYear = storeFilters.setSelectedYear,
    setMinRating = storeFilters.setMinRating,
    setMinAudienceRating = storeFilters.setMinAudienceRating,
    setCardDensity = storeFilters.setCardDensity,
  } = resolvedFilters;

  const hasMultiCategoryFilters =
    !filters || Array.isArray(filters.selectedCategories);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftSearchQuery, setDraftSearchQuery] = useState(searchQuery);
  const [draftStatus, setDraftStatus] = useState(selectedStatus);
  const [draftCategory, setDraftCategory] = useState(selectedCategory);
  const [draftCategories, setDraftCategories] = useState(
    normalizeArray(selectedCategories),
  );
  const [draftYear, setDraftYear] = useState(selectedYear);
  const [draftMinRating, setDraftMinRating] = useState(minRating);
  const [draftMinAudienceRating, setDraftMinAudienceRating] =
    useState(minAudienceRating);

  useEffect(() => {
    setDraftSearchQuery(searchQuery);
    setDraftStatus(selectedStatus);
    setDraftCategory(selectedCategory);
    setDraftCategories(normalizeArray(selectedCategories));
    setDraftYear(selectedYear);
    setDraftMinRating(minRating);
    setDraftMinAudienceRating(minAudienceRating);
  }, [
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedCategories,
    selectedYear,
    minRating,
    minAudienceRating,
  ]);

  useEffect(() => {
    if (typeof filterEntries === "function") {
      filterEntries();
    }
  }, [filterEntries]);

  const allYearsSorted = useMemo(
    () => [...(allYears || [])].sort((a, b) => b - a),
    [allYears],
  );

  const activeCategoryCount = hasMultiCategoryFilters
    ? draftCategories.length
    : draftCategory && draftCategory !== "All"
      ? 1
      : 0;

  const activeFilterCount =
    (draftSearchQuery.trim() ? 1 : 0) +
    (draftStatus !== "All" ? 1 : 0) +
    activeCategoryCount +
    (draftYear !== "All" ? 1 : 0) +
    (draftMinRating > 0 ? 1 : 0) +
    (draftMinAudienceRating > 0 ? 1 : 0);

  const applyDraftFilters = () => {
    setSearchQuery(draftSearchQuery);
    setSelectedStatus(draftStatus);

    if (hasMultiCategoryFilters) {
      setSelectedCategories(
        draftCategories.includes("All") ? [] : normalizeArray(draftCategories),
      );
    } else {
      setSelectedCategory(draftCategory);
    }

    setSelectedYear(draftYear);
    setMinRating(Number(draftMinRating));
    setMinAudienceRating(Number(draftMinAudienceRating));

    if (typeof filterEntries === "function") {
      filterEntries();
    }

    setIsFilterPanelOpen(false);
  };

  const resetFilters = () => {
    setDraftSearchQuery("");
    setDraftStatus("All");
    setDraftCategory("All");
    setDraftCategories([]);
    setDraftYear("All");
    setDraftMinRating(0);
    setDraftMinAudienceRating(0);

    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedCategory("All");
    setSelectedCategories([]);
    setSelectedYear("All");
    setMinRating(0);
    setMinAudienceRating(0);

    if (typeof filterEntries === "function") {
      filterEntries();
    }
  };

  const toggleCategory = (category) => {
    setDraftCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base border border-dark-700/90 bg-dark-900/70 p-4 sm:p-5 shadow-xl shadow-black/20"
    >
      <div className="space-y-4">
        {showAddButton && typeof onAddAnime === "function" ? (
          <div className="flex justify-center">
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAddAnime}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-blue/30 bg-accent-blue/10 px-6 py-3 text-sm font-semibold text-accent-blue transition-all duration-200 hover:border-accent-blue hover:bg-accent-blue/15 w-72"
            >
              <Plus size={18} />
              Add Anime
            </motion.button>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-accent-blue"
              size={18}
            />
            <input
              type="text"
              value={draftSearchQuery}
              onChange={(e) => setDraftSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-11 py-3 text-sm text-dark-50 placeholder-dark-400 transition-all duration-200 focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFilterPanelOpen((current) => !current)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-4 text-sm font-semibold text-dark-50 transition-all duration-200 hover:border-accent-blue/60 hover:text-accent-blue"
          >
            <SlidersHorizontal size={16} />
            Filters
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isFilterPanelOpen ? "rotate-180" : ""}`}
            />
            {activeFilterCount > 0 ? (
              <span className="ml-1 rounded-full bg-accent-blue px-2 py-0.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={applyDraftFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent-blue px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600"
          >
            Apply Filters
            <Check size={16} />
          </motion.button>
        </div>

        {/* Add button moved above the search box and centered */}

        <AnimatePresence initial={false}>
          {isFilterPanelOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/80 p-4 sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-blue">
                    Filters
                  </p>
                  <p className="mt-1 text-sm text-dark-400">
                    Narrow the list without losing the current search draft.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="rounded-full border border-dark-700 p-2 text-dark-400 transition-colors hover:border-dark-500 hover:text-dark-50"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-accent-blue">
                    Status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-dark-700 bg-dark-900 px-3 py-2.5 pr-10 appearance-none text-sm text-dark-50 transition-all duration-200 focus:border-accent-blue focus:outline-none"
                  >
                    {statusOptions.map((option) => (
                      <option
                        key={option}
                        value={option === "All Statuses" ? "All" : option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-accent-blue">
                    Release Year
                  </label>
                  <select
                    value={draftYear}
                    onChange={(e) => setDraftYear(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-dark-700 bg-dark-900 px-3 py-2.5 pr-10 appearance-none text-sm text-dark-50 transition-all duration-200 focus:border-accent-blue focus:outline-none"
                  >
                    <option value="All">All Years</option>
                    {allYearsSorted.map((year) => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-accent-blue">
                    Your Rating
                  </label>
                  <select
                    value={draftMinRating}
                    onChange={(e) => setDraftMinRating(Number(e.target.value))}
                    className="w-full cursor-pointer rounded-xl border border-dark-700 bg-dark-900 px-3 py-2.5 pr-10 appearance-none text-sm text-dark-50 transition-all duration-200 focus:border-accent-blue focus:outline-none"
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-accent-blue">
                    Audience Rating
                  </label>
                  <select
                    value={draftMinAudienceRating}
                    onChange={(e) =>
                      setDraftMinAudienceRating(Number(e.target.value))
                    }
                    className="w-full cursor-pointer rounded-xl border border-dark-700 bg-dark-900 px-3 py-2.5 pr-10 appearance-none text-sm text-dark-50 transition-all duration-200 focus:border-accent-blue focus:outline-none"
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-accent-blue">
                      Categories / Genres
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        hasMultiCategoryFilters
                          ? setDraftCategories([])
                          : setDraftCategory("All")
                      }
                      className="text-xs font-semibold text-dark-400 transition-colors hover:text-accent-blue"
                    >
                      Clear categories
                    </button>
                  </div>

                  {hasMultiCategoryFilters ? (
                    <div className="grid max-h-60 gap-2 overflow-y-auto rounded-xl border border-dark-700 bg-dark-900 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {allCategories.length > 0 ? (
                        allCategories.map((category) => {
                          const active = draftCategories.includes(category);
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${
                                active
                                  ? "border-accent-blue bg-accent-blue/10 text-dark-50"
                                  : "border-dark-700 bg-dark-800 text-dark-300 hover:border-accent-blue/40 hover:text-dark-50"
                              }`}
                            >
                              <span className="pr-3">{category}</span>
                              {active ? <Check size={14} /> : null}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-dark-400">
                          No categories found.
                        </p>
                      )}
                    </div>
                  ) : (
                    <select
                      value={draftCategory}
                      onChange={(e) => setDraftCategory(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-dark-700 bg-dark-900 px-3 py-2.5 pr-10 appearance-none text-sm text-dark-50 transition-all duration-200 focus:border-accent-blue focus:outline-none"
                    >
                      <option value="All">All Categories</option>
                      {allCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={applyDraftFilters}
                  className="rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-dark-700 px-4 py-2.5 text-sm font-semibold text-dark-300 transition-colors hover:border-dark-500 hover:text-dark-50"
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {showCardDensity ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dark-700 bg-dark-900/60 p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-accent-blue sm:mr-1 sm:px-2">
              Card density
            </span>
            {[
              { label: "Expanded", value: "expanded" },
              { label: "Normal", value: "normal" },
              { label: "Super condensed", value: "superCondensed" },
            ].map((option) => {
              const active = cardDensity === option.value;
              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCardDensity(option.value)}
                  className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition-all duration-300 sm:w-auto ${
                    active
                      ? "border-accent-blue bg-accent-blue text-white shadow-lg shadow-accent-blue/20"
                      : "border-dark-700 bg-dark-800 text-dark-200 hover:border-accent-blue/50 hover:text-dark-50"
                  }`}
                >
                  {option.label}
                </motion.button>
              );
            })}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
