import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Trash2, Edit2 } from "lucide-react";
import { RatingStars, Badge } from "./Common";
import { useAnimeStore } from "../store/store";

export const AnimeCard = ({
  anime,
  onEdit,
  onDelete,
  densityOverride,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardDensity = useAnimeStore((state) => state.cardDensity);
  const effectiveCardDensity = densityOverride || cardDensity;
  const canManageAnime =
    typeof onEdit === "function" && typeof onDelete === "function";
  const statusColors = {
    Watching: "green",
    Completed: "orange",
    Planned: "purple",
    "Plan to Watch": "purple",
    "On Hold": "amber",
    Dropped: "pink",
  };
  const normalizeStatus = (status) => {
    if (status === "Plan to Watch") return "Planned";
    return status || "Unknown";
  };
  const displayStatus = normalizeStatus(anime.status);
  const getAudienceFloat = (val) => {
    if (val === null || val === undefined) return null;
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return n > 10 ? n / 10 : n;
  };
  const audienceFloat = getAudienceFloat(anime.audience_rating);

  const densityCategoryLimit =
    effectiveCardDensity === "superCondensed"
      ? 1
      : effectiveCardDensity === "expanded"
        ? (anime.categories || []).length
        : 2;
  const densityVisibleCategories = (anime.categories || []).slice(
    0,
    densityCategoryLimit,
  );
  const hiddenCategoryCount = Math.max(
    (anime.categories || []).length - densityVisibleCategories.length,
    0,
  );
  const showExpandedDetails = effectiveCardDensity === "expanded" || isExpanded;
  const cardImageHeight =
    effectiveCardDensity === "superCondensed"
      ? "h-56"
      : effectiveCardDensity === "expanded"
        ? "h-80"
        : "h-72";
  const titleClampClass =
    effectiveCardDensity === "superCondensed"
      ? "line-clamp-1"
      : effectiveCardDensity === "expanded"
        ? "line-clamp-3"
        : "line-clamp-2";

  const toggleExpanded = () => setIsExpanded((current) => !current);
  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect?.(anime.id);
      return;
    }

    toggleExpanded();
  };

  if (effectiveCardDensity === "superCondensed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        className={`card-base group relative overflow-hidden border transition-all duration-300 shadow-lg hover:shadow-accent-blue/20 cursor-pointer p-3 sm:p-5 ${isSelected ? "border-accent-blue bg-accent-blue/5" : "border-dark-700 hover:border-accent-blue/50"}`}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        {selectionMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(anime.id);
            }}
            className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${isSelected ? "border-accent-blue bg-accent-blue text-white" : "border-dark-600 bg-black/40 text-dark-200 hover:border-accent-blue hover:text-accent-blue"}`}
            aria-pressed={isSelected}
            aria-label={
              isSelected ? `Deselect ${anime.title}` : `Select ${anime.title}`
            }
          >
            {isSelected ? "✓" : ""}
          </button>
        )}

        {canManageAnime && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <motion.button
              whileHover={{ scale: 1.08 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(anime);
              }}
              className="bg-accent-blue hover:bg-blue-600 p-1.5 sm:p-2 rounded-lg transition-colors shadow-md"
              title="Edit"
            >
              <Edit2 size={14} className="text-white sm:w-4 sm:h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(anime.id);
              }}
              className="bg-red-600 hover:bg-red-700 p-1.5 sm:p-2 rounded-lg transition-colors shadow-md"
              title="Delete"
            >
              <Trash2 size={14} className="text-white sm:w-4 sm:h-4" />
            </motion.button>
          </div>
        )}

        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden bg-dark-700 shrink-0 border border-dark-700">
            <img
              src={anime.poster_url}
              alt={anime.title}
              loading="lazy"
              decoding="async"
              width="200"
              height="300"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23334155" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23cbd5e1" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
            <h3 className="pr-14 sm:pr-0 text-lg sm:text-2xl leading-tight font-bold text-dark-50 line-clamp-1">
              {anime.title}
            </h3>

            <p className="text-dark-300 text-sm sm:text-base font-medium">
              Status: {displayStatus}
            </p>

            <div className="space-y-1.5 pt-0.5">
              <div className="overflow-x-auto">
                {anime.rating > 0 ? (
                  <div className="min-w-max">
                    <RatingStars rating={anime.rating} size="sm" />
                  </div>
                ) : (
                  <span className="text-sm text-dark-500">No rating yet</span>
                )}
              </div>
              {audienceFloat !== null && audienceFloat > 0 ? (
                <p className="text-xs text-dark-400">
                  Audience rating: {audienceFloat.toFixed(1)}/10
                </p>
              ) : null}
            </div>

            {anime.notes && (
              <p
                className={`text-sm text-dark-400 italic ${isExpanded ? "line-clamp-none" : "line-clamp-1"}`}
              >
                {anime.notes}
              </p>
            )}

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="super-condensed-details"
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="overflow-hidden space-y-2 pt-1"
                >
                  {(anime.categories || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(anime.categories || []).map((category) => (
                        <Badge
                          key={category}
                          text={category}
                          color="cyan"
                          size="sm"
                        />
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-dark-300">
                    {anime.episodes && (
                      <p>
                        <span className="text-dark-400 font-semibold">
                          Episodes:
                        </span>{" "}
                        {anime.episodes}
                      </p>
                    )}
                    {anime.release_date && (
                      <p>
                        <span className="text-dark-400 font-semibold">
                          Released:
                        </span>{" "}
                        {new Date(anime.release_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className={`card-base relative overflow-hidden group backdrop-blur-sm border transition-all duration-300 shadow-lg hover:shadow-accent-blue/20 cursor-pointer ${isSelected ? "border-accent-blue bg-accent-blue/5" : "border-dark-700 hover:border-accent-blue/50"}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {selectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(anime.id);
          }}
          className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${isSelected ? "border-accent-blue bg-accent-blue text-white" : "border-dark-600 bg-black/40 text-dark-200 hover:border-accent-blue hover:text-accent-blue"}`}
          aria-pressed={isSelected}
          aria-label={
            isSelected ? `Deselect ${anime.title}` : `Select ${anime.title}`
          }
        >
          {isSelected ? "✓" : ""}
        </button>
      )}

      <div
        className={`relative ${cardImageHeight} overflow-hidden bg-gradient-to-br from-dark-700 to-dark-800`}
      >
        <img
          src={anime.poster_url}
          alt={anime.title}
          loading="lazy"
          decoding="async"
          width="200"
          height="300"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%23334155" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23cbd5e1" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {canManageAnime && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(anime);
              }}
              className="bg-accent-blue hover:bg-blue-600 p-2.5 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
              title="Edit"
            >
              <Edit2 size={18} className="text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(anime.id);
              }}
              className="bg-red-600 hover:bg-red-700 p-2.5 rounded-lg transition-colors shadow-lg backdrop-blur-sm"
              title="Delete"
            >
              <Trash2 size={18} className="text-white" />
            </motion.button>
          </div>
        )}
      </div>

      <div
        className={`flex h-full flex-col gap-3 ${
          effectiveCardDensity === "superCondensed" ? "p-3" : "p-4"
        }`}
      >
        <div
          className={`space-y-3 ${effectiveCardDensity === "superCondensed" ? "min-h-[5.5rem]" : "min-h-[7.5rem]"}`}
        >
          <div
            className={`flex items-start justify-between gap-3 ${effectiveCardDensity === "superCondensed" ? "min-h-[3rem]" : "min-h-[3.75rem]"}`}
          >
            <h3
              className={`min-w-0 flex-1 font-bold ${effectiveCardDensity === "superCondensed" ? "text-base" : "text-lg"} ${titleClampClass} text-dark-50 group-hover:text-accent-blue transition-colors duration-300`}
            >
              {anime.title}
            </h3>

            {effectiveCardDensity !== "superCondensed" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded();
                }}
                className="mt-1 inline-flex items-center gap-1 rounded-full border border-dark-700 bg-dark-800/80 px-3 py-1 text-xs font-semibold text-dark-300 hover:border-accent-blue hover:text-dark-50 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Less <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    More <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>

          <div
            className={`flex flex-wrap gap-1.5 ${effectiveCardDensity === "superCondensed" ? "min-h-[2rem]" : "min-h-[2.5rem]"} items-start content-start`}
          >
            <Badge
              text={displayStatus}
              color={statusColors[displayStatus] || "purple"}
            />
            {densityVisibleCategories.map((category) => (
              <Badge key={category} text={category} color="cyan" size="sm" />
            ))}
            {!showExpandedDetails && hiddenCategoryCount > 0 && (
              <span className="badge-purple">+{hiddenCategoryCount} more</span>
            )}
            {showExpandedDetails &&
              (anime.categories || []).length >
                densityVisibleCategories.length &&
              (anime.categories || [])
                .slice(densityVisibleCategories.length)
                .map((category) => (
                  <Badge
                    key={category}
                    text={category}
                    color="cyan"
                    size="sm"
                  />
                ))}
          </div>
        </div>

        <div
          className={`rounded-lg border border-dark-700 bg-dark-800/60 px-3 py-2 flex items-center justify-between gap-3 ${effectiveCardDensity === "superCondensed" ? "h-[3.75rem]" : "h-[4.25rem]"}`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-blue mb-1">
              Your Rating
            </p>
            <p className="text-sm text-dark-300">
              {anime.rating > 0 ? `${anime.rating}/10` : "Not rated"}
            </p>
          </div>
          <div className="shrink-0">
            {anime.rating > 0 ? (
              <RatingStars rating={anime.rating} size="sm" />
            ) : (
              <span className="text-xs text-dark-500">No stars yet</span>
            )}
          </div>
        </div>

        <div
          className={`rounded-lg border border-dark-700 bg-dark-800/45 px-3 py-2 ${effectiveCardDensity === "superCondensed" ? "min-h-[3.25rem]" : "min-h-[3.5rem]"}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-1">
            Audience Rating
          </p>
          <p className="text-sm text-dark-300">
            {audienceFloat !== null && audienceFloat > 0
              ? `${audienceFloat.toFixed(1)}/10`
              : "Not available"}
          </p>
        </div>

        <AnimatePresence initial={false}>
          {effectiveCardDensity !== "superCondensed" && (
            <motion.div
              key={isExpanded ? "notes-expanded" : "notes-collapsed"}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className={`rounded-lg border border-dark-700 bg-dark-800/40 px-3 py-2 overflow-hidden ${showExpandedDetails ? "min-h-[4.5rem]" : "h-[4.5rem]"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-1">
                Notes
              </p>
              <p
                className={`text-dark-400 text-xs italic whitespace-pre-wrap ${showExpandedDetails ? "line-clamp-none" : "line-clamp-2"}`}
              >
                {anime.notes || "No notes added"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showExpandedDetails && (
            <motion.div
              key="expanded-details"
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="overflow-hidden space-y-2 pt-1"
            >
              <div className="space-y-2 text-xs text-dark-300">
                {anime.episodes && (
                  <p>
                    <span className="text-dark-400 font-semibold">
                      Episodes:
                    </span>{" "}
                    {anime.episodes}
                  </p>
                )}
                {anime.release_date && (
                  <p>
                    <span className="text-dark-400 font-semibold">
                      Released:
                    </span>{" "}
                    {new Date(anime.release_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>

              {effectiveCardDensity !== "expanded" && (
                <p className="text-xs text-dark-500">
                  Click the card again to collapse.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const AnimeCardGrid = ({
  anime,
  onEdit,
  onDelete,
  densityOverride,
  selectionMode = false,
  selectedAnimeIds = [],
  onToggleSelect,
  emptyTitle = "No anime found",
  emptyDescription = "Try adjusting your filters or add your first anime",
}) => {
  const cardDensity = useAnimeStore((state) => state.cardDensity);
  const effectiveCardDensity = densityOverride || cardDensity;

  if (anime.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-accent-blue/10 border-2 border-accent-blue/30 flex items-center justify-center mb-4 mx-auto">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20"></div>
        </div>
        <p className="text-2xl text-dark-50 font-bold mb-2">{emptyTitle}</p>
        <p className="text-dark-400 text-center max-w-md px-4">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        effectiveCardDensity === "superCondensed"
          ? "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      }
    >
      {anime.map((entry) => (
        <AnimeCard
          key={entry.id}
          anime={entry}
          onEdit={onEdit}
          onDelete={onDelete}
          densityOverride={densityOverride}
          selectionMode={selectionMode}
          isSelected={selectedAnimeIds.includes(entry.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};
