import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  LogOut,
  Plus,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Star,
  Layers3,
  Clock3,
} from "lucide-react";
import { useAuthStore, useAnimeStore, useUIStore } from "../store/store";
import { supabase } from "../services/supabase";
import {
  getAnimeEntries,
  addAnimeEntry,
  updateAnimeEntry,
  deleteAnimeEntry,
  getUserProfile,
} from "../services/supabase";
import {
  getProfileBookmarks,
  fetchServerBookmarks,
} from "../services/profileBookmarks";
import { AnimeCardGrid } from "../components/AnimeCard";
import { AnimeFormModal } from "../components/AnimeForm";
import { FilterBar } from "../components/FilterBar";
import {
  LoadingSkeleton,
  EmptyState,
  PaginationControls,
} from "../components/Common";
import { UserSearch } from "../components/UserSearch";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    entries,
    filteredEntries,
    isLoading,
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedCategories,
    selectedYear,
    minRating,
    minAudienceRating,
    sortBy,
    setSortBy,
    setEntries,
    setLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    filterEntries,
    setupRealtimeListener,
  } = useAnimeStore();
  const {
    isAddModalOpen,
    isEditModalOpen,
    editingEntryId,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
  } = useUIStore();
  const [editingData, setEditingData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [followedPages, setFollowedPages] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStatIndex, setExpandedStatIndex] = useState(null);
  const itemsPerPage = 20;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / itemsPerPage),
  );

  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const prof = await getUserProfile(user.id);
        setProfile(prof);
        const data = await getAnimeEntries(user.id);
        setEntries(data);
        // Real-time listener - errors are caught internally
        setupRealtimeListener(user.id);
      } catch (err) {
        console.error("Error loading entries:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate, setEntries, setLoading, setupRealtimeListener]);

  useEffect(() => {
    if (!user) {
      setFollowedPages([]);
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        const server = await fetchServerBookmarks(user.id);
        if (isMounted && Array.isArray(server)) {
          setFollowedPages(server);
          return;
        }
      } catch (err) {
        // ignore and fallback to local
      }

      if (isMounted) setFollowedPages(getProfileBookmarks(user.id));
    };

    load();
    const onUpdated = async (e) => {
      if (!user) return;
      try {
        const server = await fetchServerBookmarks(user.id);
        if (Array.isArray(server)) setFollowedPages(server);
        else setFollowedPages(getProfileBookmarks(user.id));
      } catch (err) {
        setFollowedPages(getProfileBookmarks(user.id));
      }
    };

    window.addEventListener("profileBookmarks:updated", onUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("profileBookmarks:updated", onUpdated);
    };
  }, [user]);

  // Activity feed from followed pages: fetch latest entries
  const [activityFeed, setActivityFeed] = useState([]);
  useEffect(() => {
    let isMounted = true;
    const loadActivity = async () => {
      if (!user || !followedPages || followedPages.length === 0) {
        setActivityFeed([]);
        return;
      }

      try {
        const all = [];
        // For each followed page, fetch their entries (limit recent)
        for (const p of followedPages.slice(0, 10)) {
          try {
            const entries = await getAnimeEntries(p.id);
            (entries || []).forEach((e) => {
              all.push({
                profile: p,
                entry: e,
              });
            });
          } catch (err) {
            // ignore per-profile errors
          }
        }

        const sorted = all
          .filter((x) => x.entry && x.entry.created_at)
          .sort(
            (a, b) =>
              new Date(b.entry.created_at) - new Date(a.entry.created_at),
          )
          .slice(0, 8);

        if (isMounted) setActivityFeed(sorted);
      } catch (err) {
        console.error("Error loading activity feed:", err);
      }
    };

    loadActivity();
    return () => {
      isMounted = false;
    };
  }, [followedPages, user]);

  // Apply filters when entries change
  useEffect(() => {
    filterEntries();
  }, [entries, filterEntries]);

  useEffect(() => {
    setCurrentPage(1);
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
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleAddAnime = async (formData) => {
    try {
      console.log("Adding anime with data:", formData);
      const newEntry = await addAnimeEntry({
        user_id: user.id,
        anime_id: Date.now(),
        ...formData,
      });
      console.log("Anime added successfully:", newEntry);
      addEntry(newEntry);
      closeAddModal();
    } catch (err) {
      console.error("Error adding anime:", err);
      alert("Failed to add anime: " + (err.message || err));
    }
  };

  const handleUpdateAnime = async (formData) => {
    try {
      const updated = await updateAnimeEntry(editingEntryId, formData);
      updateEntry(editingEntryId, formData);
      closeEditModal();
      setEditingData(null);
    } catch (err) {
      console.error("Error updating anime:", err);
    }
  };

  const handleDeleteAnime = (id) => {
    setDeleteConfirmId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteAnimeEntry(deleteConfirmId);
        deleteEntry(deleteConfirmId);
      } catch (err) {
        console.error("Error deleting anime:", err);
      }
    }
    setIsDeleteConfirmOpen(false);
    setDeleteConfirmId(null);
  };

  const handleEditAnime = (anime) => {
    setEditingData(anime);
    openEditModal(anime.id);
  };

  const handleSelectUser = (selectedUser) => {
    navigate(`/profile/${selectedUser.username}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

  const allCategories = Array.from(
    new Set(entries.flatMap((e) => e.categories)),
  );

  const allYears = Array.from(
    new Set(
      entries
        .filter((e) => e.release_date)
        .map((e) => new Date(e.release_date).getFullYear()),
    ),
  );

  const dashboardStats = useMemo(() => {
    const ratedEntries = filteredEntries.filter(
      (entry) => (entry.rating || 0) > 0,
    );
    const highRatedEntries = ratedEntries.filter(
      (entry) => (entry.rating || 0) >= 8,
    );
    const completedEntries = filteredEntries.filter(
      (entry) => entry.status === "Completed",
    );
    const watchingEntries = filteredEntries.filter(
      (entry) => entry.status === "Watching",
    );
    const plannedEntries = filteredEntries.filter(
      (entry) => entry.status === "Planned" || entry.status === "Plan to Watch",
    );

    const normalizeStatus = (status) => {
      if (!status) return "Unknown";
      if (status === "Plan to Watch") return "Planned";
      return status;
    };

    const statusCounts = {};
    filteredEntries.forEach((entry) => {
      const status = normalizeStatus(entry.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const rankedStatuses = Object.entries(statusCounts).sort(
      (a, b) => b[1] - a[1],
    );
    const topStatus = rankedStatuses[0]?.[0] || null;
    const runnerUpStatus = rankedStatuses[1]?.[0] || null;

    const genreCounts = {};
    filteredEntries.forEach((entry) => {
      (entry.categories || []).forEach((category) => {
        genreCounts[category] = (genreCounts[category] || 0) + 1;
      });
    });
    const rankedGenres = Object.entries(genreCounts).sort(
      (a, b) => b[1] - a[1],
    );
    const favoriteGenre = rankedGenres.length > 0 ? rankedGenres[0][0] : null;
    const runnerUpGenre = rankedGenres[1]?.[0] || null;
    const topGenres = rankedGenres.slice(0, 3);

    const recentAdds = filteredEntries.filter((entry) => {
      if (!entry.created_at) return false;
      const createdAt = new Date(entry.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return createdAt >= sevenDaysAgo;
    }).length;

    const completionRate =
      filteredEntries.length > 0
        ? Math.round((completedEntries.length / filteredEntries.length) * 100)
        : 0;

    return [
      {
        label: "Total Anime",
        count: filteredEntries.length,
        detail: "In your current view",
        icon: Sparkles,
        color: "accent-blue",
        extra: [
          `${entries.length} total in your collection`,
          `${filteredEntries.length} currently matching filters`,
          favoriteGenre ? `Top genre: ${favoriteGenre}` : "No genre data yet",
          runnerUpGenre
            ? `Next most popular: ${runnerUpGenre}`
            : "Only one genre appears right now",
        ],
      },
      {
        label: "Watching",
        count: watchingEntries.length,
        detail: `${plannedEntries.length} planned`,
        icon: TrendingUp,
        color: "accent-green",
        extra: [
          `${watchingEntries.length} shows in progress`,
          `${plannedEntries.length} queued up next`,
          topStatus ? `Most common status: ${topStatus}` : "No status data yet",
        ],
      },
      {
        label: "Completed",
        count: completedEntries.length,
        detail: `${completionRate}% completion rate`,
        icon: CheckCircle2,
        color: "accent-orange",
        extra: [
          `${completedEntries.length} titles finished`,
          `${completionRate}% of the current view is complete`,
          runnerUpStatus
            ? `Next most common status: ${runnerUpStatus}`
            : "No secondary status yet",
        ],
      },
      {
        label: "Average Rating",
        count:
          ratedEntries.length > 0
            ? (
                ratedEntries.reduce(
                  (sum, entry) => sum + (entry.rating || 0),
                  0,
                ) / ratedEntries.length
              ).toFixed(1)
            : "-",
        detail:
          ratedEntries.length > 0
            ? `${ratedEntries.length} rated entries`
            : "No ratings yet",
        icon: Star,
        color: "accent-purple",
        extra: [
          ratedEntries.length > 0
            ? `Based on ${ratedEntries.length} rated entries`
            : "Add ratings to see this metric grow",
          ratedEntries.length > 0
            ? `8+/10 ratings: ${highRatedEntries.length}`
            : "",
        ].filter(Boolean),
      },
      {
        label: "Favorite Genre",
        count: favoriteGenre || "-",
        detail: favoriteGenre
          ? `${genreCounts[favoriteGenre]} entries`
          : "No genres yet",
        icon: Layers3,
        color: "accent-blue",
        extra: [
          favoriteGenre
            ? `${genreCounts[favoriteGenre]} entries in ${favoriteGenre}`
            : "No genre data yet",
          runnerUpGenre
            ? `Next most popular: ${runnerUpGenre}`
            : "Only one genre appears right now",
          topGenres.length > 0
            ? `Top 3: ${topGenres
                .map(([name, count]) => `${name} (${count})`)
                .join(", ")}`
            : "",
        ].filter(Boolean),
      },
      {
        label: "Last 7 Days",
        count: recentAdds,
        detail: "Recent additions",
        icon: Clock3,
        color: "accent-green",
        extra: [
          `${recentAdds} title${recentAdds === 1 ? "" : "s"} added recently`,
          `Helps spot active periods in your collection`,
          recentAdds > 0
            ? `${Math.max(0, entries.length - recentAdds)} titles added earlier than this week`
            : "No additions in the last 7 days",
        ],
      },
    ];
  }, [entries.length, filteredEntries]);

  return (
    <div className="min-h-screen bg-dark-900 pb-20">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-gradient-to-r from-dark-900/80 via-dark-900/80 to-dark-900/80 border-b border-accent-blue/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          {/* Left: Title */}
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-4xl font-bold text-dark-50">
              Anime Tracker
            </h1>
            <p className="text-dark-400 text-sm mt-1">
              {entries.length} anime in collection
            </p>
          </div>

          {/* Right: User Search and Profile */}
          <div className="w-full sm:w-auto flex items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 sm:flex-none sm:w-48">
              <UserSearch onUserSelect={handleSelectUser} />
            </div>

            <div className="w-auto sm:w-36 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/bookmarks")}
                className="w-full h-10 sm:h-11 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-accent-blue text-dark-50 rounded-lg px-2 sm:px-3 text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200"
                title="Bookmarks"
              >
                <Bookmark size={16} />
                <span className="hidden sm:inline">Bookmarks</span>
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/profile")}
              className="h-10 sm:h-auto bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-accent-blue text-dark-50 rounded-lg px-2.5 sm:px-3 py-2 font-semibold flex items-center gap-2 transition-all duration-300 shrink-0"
              title="Profile"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-8 h-8 rounded-full object-cover border border-accent-blue"
                />
              ) : (
                <span className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full flex items-center justify-center text-sm font-bold text-white">
                  {profile?.username?.charAt(0).toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
        {/* Add button moved into FilterBar to align widths with the search box */}

        <div className="w-full">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openAddModal}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent-blue px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-600"
            >
              <Plus size={18} />
              Add Anime
            </motion.button>
          </div>
        </div>

        <FilterBar
          allCategories={allCategories}
          allYears={allYears}
          showAddButton={false}
          filters={{
            sortBy,
            setSortBy,
          }}
        />

        {/* Bookmarks and activity moved to /bookmarks page per request */}

        {/* Activity feed removed from dashboard */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {dashboardStats.map((stat, i) => {
            const classNames = {
              "accent-blue":
                "border-accent-blue/30 hover:border-accent-blue text-accent-blue",
              "accent-green":
                "border-accent-green/30 hover:border-accent-green text-accent-green",
              "accent-orange":
                "border-accent-orange/30 hover:border-accent-orange text-accent-orange",
              "accent-purple":
                "border-accent-purple/30 hover:border-accent-purple text-accent-purple",
            };
            const colorClass = classNames[stat.color];
            const isExpanded = expandedStatIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.01 }}
                layout
                className={`relative overflow-hidden rounded-xl border-2 backdrop-blur-sm transition-all duration-300 bg-dark-800 ${colorClass}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStatIndex((current) =>
                      current === i ? null : i,
                    )
                  }
                  className="relative z-10 w-full p-3 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-dark-400 text-xs font-medium uppercase tracking-wide">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold mt-1 break-words leading-none">
                        {stat.count}
                      </p>
                      <p className="text-[11px] text-dark-400 mt-1 line-clamp-1">
                        {stat.detail}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-lg border border-current/20 bg-black/10 p-2">
                      <stat.icon size={16} />
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      key={`${stat.label}-details`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden border-t border-current/15"
                    >
                      <div className="px-3 pb-3 pt-2 space-y-2 text-xs text-dark-300">
                        {stat.extra.map((item, detailIndex) => (
                          <div
                            key={detailIndex}
                            className="rounded-lg bg-black/10 px-3 py-2"
                          >
                            {item}
                          </div>
                        ))}
                        <p className="text-[11px] text-dark-500">
                          Click again to collapse.
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-dark-400">
                {filteredEntries.length} result
                {filteredEntries.length === 1 ? "" : "s"}
                {searchQuery ? ` for “${searchQuery}”` : ""}
              </p>
              {filteredEntries.length > itemsPerPage ? (
                <p className="text-xs text-dark-500">
                  Use the pager or jump to a page number to browse faster.
                </p>
              ) : null}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimeCardGrid
                anime={paginatedEntries}
                onEdit={handleEditAnime}
                onDelete={handleDeleteAnime}
                emptyTitle={
                  searchQuery
                    ? `No results for “${searchQuery}”`
                    : "No anime found"
                }
                emptyDescription={
                  searchQuery
                    ? "Try a different title or clear the search to view the full collection."
                    : "Try adding your first anime or adjusting your filters."
                }
              />
            </motion.div>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEntries.length}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              itemLabel="anime"
            />
          </>
        )}
      </main>

      <AnimeFormModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSubmit={handleAddAnime}
      />

      {editingData && (
        <AnimeFormModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSubmit={handleUpdateAnime}
          initialData={editingData}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md card-base p-6 border border-dark-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-dark-50 mb-2">
              Delete Anime?
            </h3>
            <p className="text-dark-300 mb-6">
              Are you sure you want to delete this anime? This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 bg-dark-700 hover:bg-dark-600 text-dark-50 font-semibold py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
