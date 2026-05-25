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

const sortOptions = [
  { label: "Latest entries", value: "latest" },
  { label: "Release date", value: "releaseDate" },
  { label: "Audience rating", value: "audienceRating" },
  { label: "Your rating", value: "userRating" },
  { label: "A-Z", value: "titleAsc" },
  { label: "Z-A", value: "titleDesc" },
];

const normalizeArray = (values) =>
  Array.from(new Set((values || []).filter(Boolean)));

const controlShellClass =
  "relative overflow-hidden rounded-xl border border-dark-700 bg-dark-900 transition-all duration-200 focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue/30";

const controlFieldClass =
  "w-full appearance-none cursor-pointer rounded-xl bg-transparent px-4 py-3 pr-10 text-sm text-dark-50 focus:outline-none";

const controlChevronClass =
  "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dark-400";

const dropdownPanelClass =
  "mt-2.5 w-full rounded-xl border border-dark-700 bg-dark-900 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)]";

const dropdownOptionClass = (active) =>
  `flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-[13px] leading-snug transition-all duration-200 sm:text-sm ${
    active
      ? "border-accent-blue bg-accent-blue/10 text-dark-50"
      : "border-dark-700 bg-dark-800 text-dark-300 hover:border-accent-blue/40 hover:text-dark-50"
  }`;

const dropdownButtonClass =
  "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:text-accent-blue sm:px-4 sm:py-3";

const DropdownMenu = ({
  label,
  valueLabel,
  options,
  activeKey,
  setActiveKey,
  selectedValue,
  onSelect,
  onReset,
  resetLabel = "Reset",
}) => {
  const isOpen = activeKey === label;

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-accent-blue">
        {label}
      </label>
      <div className={controlShellClass}>
        <button
          type="button"
          onClick={() => setActiveKey(isOpen ? null : label)}
          className={dropdownButtonClass}
          aria-expanded={isOpen}
        >
          <span className="min-w-0 truncate text-[13px] text-dark-50 sm:text-sm">
            {valueLabel}
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-dark-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={dropdownPanelClass}>
              <div className="grid max-h-72 gap-2 overflow-y-auto">
                {options.map((option) => {
                  const active = String(option.value) === String(selectedValue);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onSelect(option.value);
                        setActiveKey(null);
                      }}
                      className={dropdownOptionClass(active)}
                    >
                      <span className="min-w-0 flex-1 truncate pr-3">
                        {option.label}
                      </span>
                      {active ? <Check size={14} /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-dark-700 pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onReset?.();
                    setActiveKey(null);
                  }}
                  className="text-[11px] font-semibold text-dark-400 transition-colors hover:text-accent-blue"
                >
                  {resetLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveKey(null)}
                  className="rounded-lg border border-dark-700 px-3 py-2 text-xs font-semibold text-dark-300 transition-colors hover:border-dark-500 hover:text-dark-50"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const FilterBar = ({
  allCategories = [],
  allYears = [],
  onAddAnime,
  showAddButton = true,
  showCardDensity = true,
  autoApplyFilters = false,
  searchPlaceholder = "Search your anime list...",
  ratingLabel = "Your Rating",
  sortRatingLabel = "Your rating",
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
    sortBy = "latest",
    cardDensity = "superCondensed",
    setSearchQuery = storeFilters.setSearchQuery,
    setSelectedStatus = storeFilters.setSelectedStatus,
    setSelectedCategory = storeFilters.setSelectedCategory,
    setSelectedCategories = storeFilters.setSelectedCategories,
    setSelectedYear = storeFilters.setSelectedYear,
    setMinRating = storeFilters.setMinRating,
    setMinAudienceRating = storeFilters.setMinAudienceRating,
    setSortBy = storeFilters.setSortBy,
    setCardDensity = storeFilters.setCardDensity,
  } = resolvedFilters;

  const hasMultiCategoryFilters = Array.isArray(selectedCategories);
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
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const resolvedSortOptions = useMemo(
    () =>
      sortOptions.map((option) =>
        option.value === "userRating"
          ? { ...option, label: sortRatingLabel }
          : option,
      ),
    [sortRatingLabel],
  );

  const shouldAutoApply = autoApplyFilters || !filters;

  const commitLiveFilters = (overrides = {}) => {
    if (!shouldAutoApply || typeof filterEntries !== "function") return;
    filterEntries(overrides);
  };

  useEffect(() => {
    setDraftSearchQuery(searchQuery);
    setDraftStatus(selectedStatus);
    setDraftCategory(selectedCategory);
    setDraftCategories(normalizeArray(selectedCategories));
    setDraftYear(selectedYear);
    setDraftMinRating(minRating);
    setDraftMinAudienceRating(minAudienceRating);
    setDraftSortBy(sortBy);
  }, [
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedCategories,
    selectedYear,
    minRating,
    minAudienceRating,
    sortBy,
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
    (draftMinAudienceRating > 0 ? 1 : 0) +
    (draftSortBy !== "latest" ? 1 : 0);

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
    setSortBy(draftSortBy);

    if (typeof filterEntries === "function") {
      filterEntries({ searchQuery: draftSearchQuery, sortBy: draftSortBy });
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
    setDraftSortBy("latest");
    setIsCategoriesOpen(false);
    setActiveDropdown(null);

    setSearchQuery("");
    setSelectedStatus("All");
    setSelectedCategory("All");
    setSelectedCategories([]);
    setSelectedYear("All");
    setMinRating(0);
    setMinAudienceRating(0);
    setSortBy("latest");

    if (typeof filterEntries === "function") {
      filterEntries({ searchQuery: "", sortBy: "latest" });
    }
  };

  const toggleCategory = (category) => {
    const nextCategories = draftCategories.includes(category)
      ? draftCategories.filter((item) => item !== category)
      : [...draftCategories, category];

    setDraftCategories(nextCategories);
    setSelectedCategories(nextCategories);
    commitLiveFilters();
  };

  const handleSearchChange = (value) => {
    setDraftSearchQuery(value);
    setSearchQuery(value);

    commitLiveFilters({ searchQuery: value });
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
              className="inline-flex w-full max-w-72 items-center justify-center gap-2 rounded-xl border border-accent-blue/30 bg-accent-blue/10 px-6 py-3 text-sm font-semibold text-accent-blue transition-all duration-200 hover:border-accent-blue hover:bg-accent-blue/15"
            >
              <Plus size={18} />
              Add Anime
            </motion.button>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-accent-blue"
              size={18}
            />
            <input
              type="text"
              value={draftSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-11 py-3 pr-11 text-sm text-dark-50 placeholder-dark-400 transition-all duration-200 focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
            />
            {draftSearchQuery ? (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 transition-colors hover:text-dark-100"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFilterPanelOpen((current) => !current)}
            className="inline-flex h-12 self-end items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-4 text-sm font-semibold text-dark-50 transition-all duration-200 hover:border-accent-blue/60 hover:text-accent-blue"
          >
            <SlidersHorizontal size={16} />
            Filter / Sort
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-blue">
                    Filter / Sort
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-dark-400 sm:text-sm">
                    Narrow and reorder the list without losing the current
                    search draft.
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

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <DropdownMenu
                  label="Status"
                  valueLabel={draftStatus}
                  options={statusOptions.map((option) => ({
                    label: option,
                    value: option === "All Statuses" ? "All" : option,
                  }))}
                  activeKey={activeDropdown}
                  setActiveKey={setActiveDropdown}
                  selectedValue={draftStatus}
                  onSelect={(value) => {
                    setDraftStatus(value);
                    setSelectedStatus(value);
                    commitLiveFilters();
                  }}
                  onReset={() => {
                    setDraftStatus("All");
                    setSelectedStatus("All");
                    commitLiveFilters();
                  }}
                  resetLabel="All Statuses"
                />

                <DropdownMenu
                  label="Release Year"
                  valueLabel={draftYear}
                  options={[
                    { label: "All Years", value: "All" },
                    ...allYearsSorted.map((year) => ({
                      label: String(year),
                      value: String(year),
                    })),
                  ]}
                  activeKey={activeDropdown}
                  setActiveKey={setActiveDropdown}
                  selectedValue={draftYear}
                  onSelect={(value) => {
                    setDraftYear(value);
                    setSelectedYear(value);
                    commitLiveFilters();
                  }}
                  onReset={() => {
                    setDraftYear("All");
                    setSelectedYear("All");
                    commitLiveFilters();
                  }}
                  resetLabel="All Years"
                />

                <DropdownMenu
                  label={ratingLabel}
                  valueLabel={
                    ratingOptions.find(
                      (option) => option.value === draftMinRating,
                    )?.label || "Any Rating"
                  }
                  options={ratingOptions}
                  activeKey={activeDropdown}
                  setActiveKey={setActiveDropdown}
                  selectedValue={draftMinRating}
                  onSelect={(value) => {
                    const nextValue = Number(value);
                    setDraftMinRating(nextValue);
                    setMinRating(nextValue);
                    commitLiveFilters();
                  }}
                  onReset={() => {
                    setDraftMinRating(0);
                    setMinRating(0);
                    commitLiveFilters();
                  }}
                  resetLabel="Any Rating"
                />

                <DropdownMenu
                  label="Audience Rating"
                  valueLabel={
                    ratingOptions.find(
                      (option) => option.value === draftMinAudienceRating,
                    )?.label || "Any Rating"
                  }
                  options={ratingOptions}
                  activeKey={activeDropdown}
                  setActiveKey={setActiveDropdown}
                  selectedValue={draftMinAudienceRating}
                  onSelect={(value) => {
                    const nextValue = Number(value);
                    setDraftMinAudienceRating(nextValue);
                    setMinAudienceRating(nextValue);
                    commitLiveFilters();
                  }}
                  onReset={() => {
                    setDraftMinAudienceRating(0);
                    setMinAudienceRating(0);
                    commitLiveFilters();
                  }}
                  resetLabel="Any Rating"
                />

                <DropdownMenu
                  label="Sort"
                  valueLabel={
                    resolvedSortOptions.find(
                      (option) => option.value === draftSortBy,
                    )?.label || "Latest entries"
                  }
                  options={resolvedSortOptions}
                  activeKey={activeDropdown}
                  setActiveKey={setActiveDropdown}
                  selectedValue={draftSortBy}
                  onSelect={(value) => {
                    setDraftSortBy(value);
                    setSortBy(value);
                    commitLiveFilters({ sortBy: value });
                  }}
                  onReset={() => {
                    setDraftSortBy("latest");
                    setSortBy("latest");
                    commitLiveFilters({ sortBy: "latest" });
                  }}
                  resetLabel="Latest entries"
                />

                <div className="md:col-span-2 xl:col-span-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-accent-blue">
                      Categories / Genres
                    </label>
                    {activeCategoryCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (hasMultiCategoryFilters) {
                            setDraftCategories([]);
                            setSelectedCategories([]);
                          } else {
                            setDraftCategory("All");
                            setSelectedCategory("All");
                          }
                          commitLiveFilters();
                        }}
                        className="text-[11px] font-semibold text-dark-400 transition-colors hover:text-accent-blue"
                      >
                        Clear categories
                      </button>
                    ) : null}
                  </div>

                  <div className={controlShellClass}>
                    <button
                      type="button"
                      onClick={() => setIsCategoriesOpen((current) => !current)}
                      className={dropdownButtonClass}
                      aria-expanded={isCategoriesOpen}
                    >
                      <span className="min-w-0 truncate text-[13px] text-dark-50 sm:text-sm">
                        {activeCategoryCount > 0
                          ? hasMultiCategoryFilters
                            ? `${activeCategoryCount} selected`
                            : draftCategory
                          : "Choose one or more genres"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {activeCategoryCount > 0 ? (
                          <span className="rounded-full bg-accent-blue px-2 py-0.5 text-[10px] font-bold leading-none text-white">
                            {activeCategoryCount}
                          </span>
                        ) : null}
                        <ChevronDown
                          size={16}
                          className={`text-dark-400 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isCategoriesOpen ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={dropdownPanelClass}>
                          <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                            {allCategories.length > 0 ? (
                              allCategories.map((category) => {
                                const active =
                                  draftCategories.includes(category);
                                return (
                                  <button
                                    key={category}
                                    type="button"
                                    onClick={() => toggleCategory(category)}
                                    className={dropdownOptionClass(active)}
                                  >
                                    <span className="min-w-0 flex-1 truncate pr-3">
                                      {category}
                                    </span>
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
                          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-dark-700 pt-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasMultiCategoryFilters) {
                                  setDraftCategories([]);
                                  setSelectedCategories([]);
                                } else {
                                  setDraftCategory("All");
                                  setSelectedCategory("All");
                                }
                                commitLiveFilters();
                              }}
                              className="text-[11px] font-semibold text-dark-400 transition-colors hover:text-accent-blue"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCategoriesOpen(false)}
                              className="rounded-lg border border-dark-700 px-3 py-2 text-xs font-semibold text-dark-300 transition-colors hover:border-dark-500 hover:text-dark-50"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {!autoApplyFilters ? (
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
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-dark-700 px-4 py-2.5 text-sm font-semibold text-dark-300 transition-colors hover:border-dark-500 hover:text-dark-50"
                  >
                    Reset Filters
                  </button>
                  <p className="text-xs text-dark-500">
                    Filters update as you type or select options.
                  </p>
                </div>
              )}
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
