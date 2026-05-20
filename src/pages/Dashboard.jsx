import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Plus, X } from "lucide-react";
import { useAuthStore, useAnimeStore, useUIStore } from "../store/store";
import { supabase } from "../services/supabase";
import {
  getAnimeEntries,
  addAnimeEntry,
  updateAnimeEntry,
  deleteAnimeEntry,
  getUserProfile,
} from "../services/supabase";
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [selectedUserAnime, setSelectedUserAnime] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [selectedAnimeDetail, setSelectedAnimeDetail] = useState(null);

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

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    try {
      const userProfile = await getUserProfile(user.id);
      setSelectedUserProfile(userProfile);
      const userAnime = await getAnimeEntries(user.id);
      setSelectedUserAnime(userAnime);
    } catch (err) {
      console.error("Error loading user profile:", err);
    }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          {/* Left: Title */}
          <div>
            <h1 className="text-4xl font-bold text-dark-50">Anime Tracker</h1>
            <p className="text-dark-400 text-sm mt-1">
              {entries.length} anime in collection
            </p>
          </div>

          {/* Center: Add Anime Button */}
          <div className="flex-1 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Add Anime
            </motion.button>
          </div>

          {/* Right: User Search and Profile */}
          <div className="flex gap-3 items-center">
            <div className="w-48">
              <UserSearch onUserSelect={handleSelectUser} />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/profile")}
              className="bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-accent-blue text-dark-50 rounded-lg px-3 py-2 font-semibold flex items-center gap-2 transition-all duration-300"
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
        <FilterBar allCategories={allCategories} allYears={allYears} />

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

      {/* Selected User Profile Modal */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedUser(null)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-800 rounded-xl border border-dark-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            {/* User Header */}
            <div className="bg-gradient-to-r from-accent-blue/20 to-accent-purple/20 p-6 border-b border-dark-700">
              <div className="flex items-center gap-4">
                {selectedUser.avatar_url ? (
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-accent-blue"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-accent-blue/20 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-accent-blue">
                      {selectedUser.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-dark-50">
                    {selectedUser.username}
                  </h2>
                  <p className="text-dark-400 text-sm">
                    {selectedUserAnime.length} anime in collection
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="ml-auto text-dark-400 hover:text-dark-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* User's Anime Collection */}
            <div className="p-6">
              {selectedUserAnime.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-dark-400">
                    {selectedUser.username} has no anime in their collection yet
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-dark-50 mb-4">
                    Anime Collection
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedUserAnime.map((anime) => (
                      <button
                        key={anime.id}
                        onClick={() => setSelectedAnimeDetail(anime)}
                        className="card-base p-4 flex items-start gap-3 hover:bg-dark-700 transition-colors text-left"
                      >
                        {anime.cover_image && (
                          <img
                            src={anime.cover_image}
                            alt={anime.title}
                            className="w-12 h-16 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-dark-50 truncate">
                            {anime.title}
                          </p>
                          <p className="text-xs text-dark-400">
                            Status: {anime.status}
                          </p>
                          {anime.episodes_watched && (
                            <p className="text-xs text-accent-blue">
                              {anime.episodes_watched} episodes watched
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
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
            className="bg-dark-800 rounded-xl border border-dark-700 p-6 max-w-sm w-full shadow-2xl"
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

      {/* Anime Detail Modal */}
      {selectedAnimeDetail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedAnimeDetail(null)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-800 rounded-xl border border-dark-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-dark-50">
                {selectedAnimeDetail.title}
              </h2>
              <button
                onClick={() => setSelectedAnimeDetail(null)}
                className="text-3xl text-dark-400 hover:text-accent-blue transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-4">
                {selectedAnimeDetail.cover_image && (
                  <img
                    src={selectedAnimeDetail.cover_image}
                    alt={selectedAnimeDetail.title}
                    className="w-32 h-48 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-dark-400 font-semibold">
                        Status
                      </p>
                      <p className="text-lg text-dark-50">
                        {selectedAnimeDetail.status}
                      </p>
                    </div>

                    {selectedAnimeDetail.rating > 0 && (
                      <div>
                        <p className="text-sm text-dark-400 font-semibold">
                          Their Rating
                        </p>
                        <p className="text-lg text-accent-yellow">
                          {"⭐".repeat(selectedAnimeDetail.rating)}
                        </p>
                      </div>
                    )}

                    {selectedAnimeDetail.episodes_watched && (
                      <div>
                        <p className="text-sm text-dark-400 font-semibold">
                          Episodes Watched
                        </p>
                        <p className="text-lg text-dark-50">
                          {selectedAnimeDetail.episodes_watched}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedAnimeDetail.notes && (
                <div>
                  <p className="text-sm text-dark-400 font-semibold mb-2">
                    Their Notes
                  </p>
                  <div className="bg-dark-700 rounded-lg p-4 border border-dark-600">
                    <p className="text-dark-50 whitespace-pre-wrap">
                      {selectedAnimeDetail.notes}
                    </p>
                  </div>
                </div>
              )}

              {!selectedAnimeDetail.notes &&
                selectedAnimeDetail.rating === 0 && (
                  <div className="text-center p-8 text-dark-400">
                    <p>No notes or rating for this anime</p>
                  </div>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
