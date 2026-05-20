import { useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useAnimeStore } from "../store/store";

export const FilterBar = ({ allCategories, allYears }) => {
  const {
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedYear,
    minRating,
    setSearchQuery,
    setSelectedStatus,
    setSelectedCategory,
    setSelectedYear,
    setMinRating,
    filterEntries,
  } = useAnimeStore();

  useEffect(() => {
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
      <div className="relative">
        <Search
          className="absolute left-4 top-3.5 text-accent-blue"
          size={20}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search anime by title..."
          className="w-full bg-dark-700 border border-dark-600 rounded-lg pl-12 pr-4 py-3 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30 transition-all duration-300"
        />
      </div>

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
            Min Rating: {minRating}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full cursor-pointer accent-accent-blue h-2.5"
          />
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
