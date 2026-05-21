import { useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { useAnimeStore } from "../store/store";

export const FilterBar = ({
  allCategories,
  allYears,
  onAddAnime,
  showAddButton = true,
  showCardDensity = true,
  searchPlaceholder = "Search anime in your list by title",
  filters,
}) => {
  const storeFilters = useAnimeStore();
  const {
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedYear,
    minRating,
    cardDensity,
    setSearchQuery,
    setSelectedStatus,
    setSelectedCategory,
    setSelectedYear,
    setMinRating,
    setCardDensity,
    filterEntries,
  } = filters || storeFilters;

  useEffect(() => {
    if (typeof filterEntries !== "function") return;
    filterEntries();
  }, [
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedYear,
    minRating,
    filterEntries,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-6 space-y-4 border border-dark-700 hover:border-accent-blue/30 transition-all duration-300"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search
            className="absolute left-4 top-3.5 text-accent-blue"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-12 pr-4 py-3 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300"
          />
        </div>

        {showAddButton && typeof onAddAnime === "function" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAddAnime}
            className="w-full lg:w-52 bg-accent-blue hover:bg-blue-600 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-300 border border-blue-500 shadow-lg shadow-accent-blue/25 hover:shadow-accent-blue/35 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={18} className="text-dark-900/70" />
            Add Anime
          </motion.button>
        )}
      </div>

      {showCardDensity && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dark-700 bg-dark-800/50 p-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-blue px-2 mr-1">
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
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 border ${
                  active
                    ? "bg-accent-blue text-white border-accent-blue shadow-lg shadow-accent-blue/20"
                    : "bg-dark-700 text-dark-200 border-dark-600 hover:border-accent-blue/50 hover:text-dark-50"
                }`}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="text-xs font-semibold text-accent-blue block mb-2 uppercase tracking-wide">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300 cursor-pointer hover:border-dark-500"
          >
            <option value="All">All Status</option>
            <option value="Watching">Watching</option>
            <option value="Completed">Completed</option>
            <option value="Plan to Watch">Plan to Watch</option>
            <option value="Dropped">Dropped</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-accent-blue block mb-2 uppercase tracking-wide">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300 cursor-pointer hover:border-dark-500"
          >
            <option value="All">All Categories</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-accent-blue block mb-2 uppercase tracking-wide">
            Release Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300 cursor-pointer hover:border-dark-500"
          >
            <option value="All">All Years</option>
            {allYears &&
              allYears
                .sort((a, b) => b - a)
                .map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-accent-blue block mb-2 uppercase tracking-wide">
            Min rating
          </label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm text-dark-50 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300 cursor-pointer hover:border-dark-500"
          >
            <option value={0}>Any rating</option>
            <option value={1}>1 or higher</option>
            <option value={2}>2 or higher</option>
            <option value={3}>3 or higher</option>
            <option value={4}>4 or higher</option>
            <option value={5}>5 or higher</option>
            <option value={6}>6 or higher</option>
            <option value={7}>7 or higher</option>
            <option value={8}>8 or higher</option>
            <option value={9}>9 or higher</option>
            <option value={10}>10 only</option>
          </select>
        </div>

        <div className="flex items-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("All");
              setSelectedCategory("All");
              setSelectedYear("All");
              setMinRating(0);
            }}
            className="w-full bg-dark-700 hover:bg-dark-600 text-accent-blue font-semibold rounded-lg px-3 py-2.5 text-sm transition-all duration-300 border border-dark-600 hover:border-accent-blue/50 active:scale-95"
          >
            Reset Filters
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
