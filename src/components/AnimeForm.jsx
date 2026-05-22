import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnimeStore } from "../store/store";
import { RatingStars, Badge } from "./Common";
import { searchAnime, formatAnimeForEntry } from "../services/jikanAPI";
import { useDebounce } from "../hooks/useCustom";

export const AnimeFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
}) => {
  const normalizedInitialStatus =
    initialData?.status === "Plan to Watch"
      ? "Planned"
      : initialData?.status || "Completed";
  const normalizeAudience = (val) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (Number.isNaN(num)) return null;
    return num > 10 ? num / 10 : num;
  };
  const [title, setTitle] = useState(initialData?.title || "");
  const [posterUrl, setPosterUrl] = useState(initialData?.poster_url || "");
  const [categories, setCategories] = useState(initialData?.categories || []);
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [audienceRating, setAudienceRating] = useState(
    normalizeAudience(initialData?.audience_rating || null),
  );
  const [status, setStatus] = useState(normalizedInitialStatus);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [episodes, setEpisodes] = useState(initialData?.episodes || "");
  const [releaseDate, setReleaseDate] = useState(
    initialData?.release_date || "",
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  // Reset form when modal opens/closes or when initialData changes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setPosterUrl(initialData?.poster_url || "");
      setCategories(initialData?.categories || []);
      setRating(initialData?.rating || 0);
      setAudienceRating(normalizeAudience(initialData?.audience_rating || null));
      setStatus(normalizedInitialStatus);
      setNotes(initialData?.notes || "");
      setEpisodes(initialData?.episodes || "");
      setReleaseDate(initialData?.release_date || "");
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (debouncedSearch.length > 0) {
      const performSearch = async () => {
        setIsSearching(true);
        const results = await searchAnime(debouncedSearch);
        setSearchResults(results);
        setIsSearching(false);
      };
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const handleSelectAnime = (anime) => {
    const formatted = formatAnimeForEntry(anime);
    setTitle(formatted.title);
    setPosterUrl(formatted.poster_url);
    setCategories(formatted.categories);
    setEpisodes(formatted.episodes ? formatted.episodes.toString() : "");
    setReleaseDate(formatted.release_date || "");
    setAudienceRating(normalizeAudience(formatted.audience_rating || null));
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddCategory = (category) => {
    if (!categories.includes(category)) {
      setCategories([...categories, category]);
    }
  };

  const handleRemoveCategory = (category) => {
    setCategories(categories.filter((c) => c !== category));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter an anime title");
      return;
    }

    try {
      // Convert audience rating to SMALLINT tenths for DB (e.g., 8.7 -> 87)
      const audience_payload =
        audienceRating === null || audienceRating === undefined
          ? null
          : Math.round(Number(audienceRating) * 10);

      onSubmit({
        title,
        poster_url: posterUrl,
        categories,
        rating,
        audience_rating: audience_payload,
        status,
        notes,
        episodes: episodes ? parseInt(episodes) : null,
        release_date: releaseDate || null,
      });
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Error adding anime: " + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-700 shadow-2xl"
      >
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-dark-50">
            {initialData ? "Edit Anime" : "Add New Anime"}
          </h2>
          <button
            onClick={onClose}
            className="text-3xl text-dark-400 hover:text-accent-blue transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Search Anime (Optional)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search from MyAnimeList..."
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
            />

            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 space-y-2 max-h-64 overflow-y-auto"
              >
                {searchResults.map((anime) => (
                  <button
                    key={anime.id}
                    type="button"
                    onClick={() => handleSelectAnime(anime)}
                    className="w-full text-left p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors flex gap-3"
                  >
                    <img
                      src={anime.coverImage?.large}
                      alt={anime.title?.english || anime.title?.romaji}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-dark-50">
                        {anime.title?.english || anime.title?.romaji}
                      </p>
                      <p className="text-dark-400 text-xs">
                        {anime.genres?.join(", ")}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {isSearching && <p className="text-dark-400 mt-2">Searching...</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anime title"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Poster URL
            </label>
            <input
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
            />
            {posterUrl && (
              <img
                src={posterUrl}
                alt="Preview"
                className="mt-3 h-48 object-cover rounded-lg"
                onError={(e) => (e.target.style.display = "none")}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Categories
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((cat) => (
                <Badge key={cat} text={cat} color="cyan" />
              ))}
            </div>
            <input
              type="text"
              placeholder="Add category (e.g., Romance, Action)"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Your Rating
            </label>
            <RatingStars
              rating={rating}
              onChange={setRating}
              interactive
              size="lg"
            />
            {audienceRating ? (
              <p className="mt-2 text-xs text-dark-400">
                Audience rating: {audienceRating}/10
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-accent-blue">
                Episodes
              </label>
              <input
                type="number"
                value={episodes}
                onChange={(e) => setEpisodes(e.target.value)}
                placeholder="Number of episodes"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-accent-blue">
                Release Date
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 focus:outline-none focus:border-accent-blue transition-colors"
            >
              <option>Watching</option>
              <option>Completed</option>
              <option>Planned</option>
              <option>On Hold</option>
              <option>Dropped</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-accent-blue">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this anime..."
              rows="3"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn-primary">
              {initialData ? "Update Anime" : "Add Anime"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
