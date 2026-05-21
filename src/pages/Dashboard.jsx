import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, LogOut, Plus } from "lucide-react";
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
import { LoadingSkeleton, EmptyState } from "../components/Common";
import { UserSearch } from "../components/UserSearch";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    entries,
    filteredEntries,
    isLoading,
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
        <FilterBar
          allCategories={allCategories}
          allYears={allYears}
          onAddAnime={openAddModal}
        />

        {/* Bookmarks and activity moved to /bookmarks page per request */}

        {/* Activity feed removed from dashboard */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            {
              label: "Total",
              count: entries.length,
              color: "accent-blue",
            },
            {
              label: "Watching",
              count: entries.filter((e) => e.status === "Watching").length,
              color: "accent-green",
            },
            {
              label: "Completed",
              count: entries.filter((e) => e.status === "Completed").length,
              color: "accent-orange",
            },
            {
              label: "Avg Rating",
              count:
                entries.length > 0
                  ? (
                      entries.reduce((sum, e) => sum + e.rating, 0) /
                      entries.length
                    ).toFixed(1)
                  : 0,
              color: "accent-purple",
            },
          ].map((stat, i) => {
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
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className={`relative overflow-hidden rounded-lg p-4 border-2 backdrop-blur-sm transition-all duration-300 bg-dark-800 ${colorClass}`}
              >
                <div className="relative z-10">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <p className="text-dark-400 text-sm font-medium">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.count}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredEntries.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimeCardGrid
              anime={filteredEntries}
              onEdit={handleEditAnime}
              onDelete={handleDeleteAnime}
            />
          </motion.div>
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
