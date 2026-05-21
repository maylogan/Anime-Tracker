import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  LogOut,
  User,
  Edit2,
  Check,
  X,
  Camera,
  Shield,
} from "lucide-react";
import { useAuthStore } from "../store/store";
import {
  supabase,
  getUserProfile,
  getUserProfileByIdentifier,
  getAnimeEntries,
  updateUserProfile,
  checkUsernameAvailable,
  uploadAvatar,
} from "../services/supabase";
import { AnimeCardGrid } from "../components/AnimeCard";
import { FilterBar } from "../components/FilterBar";
import {
  isProfileBookmarked,
  toggleProfileBookmark,
} from "../services/profileBookmarks";

export const Profile = () => {
  const navigate = useNavigate();
  const { identifier } = useParams();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [profileAnime, setProfileAnime] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bio, setBio] = useState("");
  const isPublicProfile = Boolean(identifier);
  const isOwnProfilePage = profile?.id && user?.id === profile.id;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const targetProfile = isPublicProfile
          ? await getUserProfileByIdentifier(identifier)
          : await getUserProfile(user.id);

        if (!isMounted) return;

        setProfile(targetProfile);
        setBio(targetProfile?.bio || "");
        setNewUsername(targetProfile?.username || "");

        if (isPublicProfile && targetProfile?.id) {
          const targetAnime = await getAnimeEntries(targetProfile.id);
          if (!isMounted) return;

          setProfileAnime(targetAnime);
          setIsBookmarked(isProfileBookmarked(user.id, targetProfile.id));
        } else {
          setProfileAnime([]);
          setIsBookmarked(false);
        }

        setError("");
      } catch (err) {
        console.error("Error loading profile:", err);
        if (isMounted) {
          setError(err.message || "Failed to load profile");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user, identifier, isPublicProfile, navigate]);

  useEffect(() => {
    setBio(profile?.bio || "");
  }, [profile]);

  const stats = useMemo(() => {
    if (!profileAnime || profileAnime.length === 0)
      return {
        totalWatched: 0,
        avgRating: 0,
        favoriteGenre: null,
      };

    const totalWatched = profileAnime.filter(
      (a) => a.status === "Completed",
    ).length;
    const rated = profileAnime.filter(
      (a) => typeof a.rating === "number" && a.rating > 0,
    );
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length
        : 0;

    const genreCounts = {};
    profileAnime.forEach((a) => {
      (a.categories || []).forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const favoriteGenre =
      Object.keys(genreCounts).length > 0
        ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    return { totalWatched, avgRating, favoriteGenre };
  }, [profileAnime]);

  const handleSaveBio = async () => {
    if (!user) return;
    try {
      const updated = await updateUserProfile(user.id, { bio: bio || "" });
      setProfile(updated || { ...profile, bio });
      setSuccess("Bio updated!");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("Error saving bio:", err);
      setError(err.message || "Failed to save bio");
    }
  };

  // Profile list filters
  const [profileQuery, setProfileQuery] = useState("");
  const [profileStatusFilter, setProfileStatusFilter] = useState("All");
  const [profileCategoryFilter, setProfileCategoryFilter] = useState("All");
  const [profileYearFilter, setProfileYearFilter] = useState("All");
  const [profileMinRating, setProfileMinRating] = useState(0);

  const profileCategories = useMemo(
    () =>
      Array.from(
        new Set((profileAnime || []).flatMap((a) => a.categories || [])),
      ),
    [profileAnime],
  );

  const profileYears = useMemo(
    () =>
      Array.from(
        new Set(
          (profileAnime || [])
            .filter((a) => a.release_date)
            .map((a) => new Date(a.release_date).getFullYear())
            .filter((year) => !Number.isNaN(year)),
        ),
      ),
    [profileAnime],
  );

  const filteredProfileAnime = useMemo(() => {
    if (!profileAnime) return [];
    const q = (profileQuery || "").trim().toLowerCase();
    return profileAnime.filter((a) => {
      if (
        profileStatusFilter &&
        profileStatusFilter !== "All" &&
        a.status !== profileStatusFilter
      )
        return false;

      if (
        profileCategoryFilter &&
        profileCategoryFilter !== "All" &&
        !(a.categories || []).includes(profileCategoryFilter)
      )
        return false;

      if (profileYearFilter && profileYearFilter !== "All") {
        const year = a.release_date
          ? new Date(a.release_date).getFullYear().toString()
          : "";
        if (year !== profileYearFilter) return false;
      }

      if ((a.rating || 0) < profileMinRating) return false;

      if (!q) return true;
      const inTitle = (a.title || "").toLowerCase().includes(q);
      const inNotes = (a.notes || "").toLowerCase().includes(q);
      const inCats = (a.categories || []).some((c) =>
        c.toLowerCase().includes(q),
      );
      return inTitle || inNotes || inCats;
    });
  }, [
    profileAnime,
    profileQuery,
    profileStatusFilter,
    profileCategoryFilter,
    profileYearFilter,
    profileMinRating,
  ]);

  const checkUsername = async (username) => {
    if (!username.trim()) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const available = await checkUsernameAvailable(username);
      setIsAvailable(available);
      if (!available) {
        setError("Username is already taken");
      } else {
        setError("");
      }
    } catch (err) {
      console.error("Error checking username:", err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty");
      return;
    }

    if (newUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (newUsername.length > 30) {
      setError("Username must be 30 characters or less");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      setError(
        "Username can only contain letters, numbers, underscores, and hyphens",
      );
      return;
    }

    if (profile?.username === newUsername) {
      setIsEditing(false);
      return;
    }

    if (!isAvailable) {
      setError("Username is already taken");
      return;
    }

    try {
      const updated = await updateUserProfile(user.id, {
        username: newUsername,
      });
      if (!updated) {
        throw new Error("No data returned from server");
      }
      setProfile(updated);
      setIsEditing(false);
      setError("");
      setSuccess("Username updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err.message);
      setError(err.message || "Failed to update username");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setProfile({ ...profile, avatar_url: url });
      setError("");
      setSuccess("Avatar updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error uploading avatar:", err.message);
      setError(err.message || "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !profile?.id) return;

    setIsBookmarking(true);
    try {
      toggleProfileBookmark(user.id, profile);
      const bookmarked = !isBookmarked;
      setIsBookmarked(bookmarked);
      setSuccess(
        bookmarked
          ? "Page saved to your bookmarks"
          : "Page removed from your bookmarks",
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating bookmarked pages:", err);
      setError(err.message || "Failed to update saved pages");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

  if (isLoadingProfile && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-dark-700 border-t-accent-blue animate-spin mb-4 mx-auto"></div>
          <p className="text-white font-bold text-xl mb-2">Anime Tracker</p>
          <p className="text-dark-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isPublicProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 backdrop-blur-md bg-dark-900/80 border-b border-accent-blue/20"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-accent-blue hover:text-accent-blue/70 transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft size={20} />
              Back to Tracker
            </button>
            <h2 className="text-xl font-bold text-dark-50">Profile</h2>
            <div className="w-20" />
          </div>
        </motion.div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-600/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl backdrop-blur-sm"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-green-600/20 border border-green-500/50 text-green-200 px-6 py-3 rounded-xl backdrop-blur-sm flex items-center gap-2"
            >
              <Check size={18} /> {success}
            </motion.div>
          )}

          {!profile ? (
            <div className="card-base p-10 text-center">
              <h2 className="text-2xl font-bold text-dark-50 mb-2">
                Profile not found
              </h2>
              <p className="text-dark-300 mb-6">
                The page you are trying to open does not exist or has not been
                created yet.
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="btn-primary"
              >
                Return to dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-base p-8"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-24 h-24 rounded-full object-cover border-2 border-accent-blue"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full flex items-center justify-center border-2 border-accent-blue">
                          <User size={48} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-dark-400 mb-2 flex items-center gap-2">
                        <Shield size={14} /> Shared profile page
                      </p>
                      <h1 className="text-3xl font-bold text-white mb-2">
                        {profile.username}
                      </h1>
                      <p className="text-dark-300 text-sm mb-3 break-all">
                        {profile?.created_at
                          ? `Joined ${new Date(
                              profile.created_at,
                            ).toLocaleDateString()}`
                          : "Profile page"}
                      </p>
                      {profile?.bio ? (
                        <p className="text-dark-400 text-sm mb-2">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-dark-500 text-sm mb-2">
                          No bio provided
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <p className="text-dark-400 text-xs sm:text-sm">
                          {profileAnime.length} anime in collection
                        </p>
                        <div className="text-dark-400 text-xs sm:text-sm">
                          •
                        </div>
                        <p className="text-dark-400 text-xs sm:text-sm">
                          Watched: {stats.totalWatched}
                        </p>
                        <div className="text-dark-400 text-xs sm:text-sm">
                          •
                        </div>
                        <p className="text-dark-400 text-xs sm:text-sm">
                          Avg:{" "}
                          {stats.avgRating ? stats.avgRating.toFixed(1) : "-"}
                        </p>
                        {stats.favoriteGenre && (
                          <>
                            <div className="text-dark-400 text-xs sm:text-sm">
                              •
                            </div>
                            <p className="text-dark-400 text-xs sm:text-sm">
                              Fav: {stats.favoriteGenre}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {isOwnProfilePage ? (
                      <button
                        onClick={() => navigate("/profile")}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Edit2 size={16} />
                        Edit profile settings
                      </button>
                    ) : (
                      <button
                        onClick={handleToggleBookmark}
                        disabled={isBookmarking}
                        className="btn-primary flex items-center gap-2 disabled:opacity-70"
                      >
                        {isBookmarked ? (
                          <BookmarkCheck size={16} />
                        ) : (
                          <Bookmark size={16} />
                        )}
                        {isBookmarking
                          ? "Updating..."
                          : isBookmarked
                            ? "Saved page"
                            : "Follow page"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.section>

              <div className="space-y-8">
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold text-dark-50">
                      Anime Collection
                    </h2>
                    <p className="text-dark-400 text-sm mt-1">
                      What this profile has tracked so far
                    </p>
                  </div>

                  <FilterBar
                    allCategories={profileCategories}
                    allYears={profileYears}
                    showAddButton={false}
                    showCardDensity={false}
                    searchPlaceholder="Search anime in this collection by title"
                    filters={{
                      searchQuery: profileQuery,
                      selectedStatus: profileStatusFilter,
                      selectedCategory: profileCategoryFilter,
                      selectedYear: profileYearFilter,
                      minRating: profileMinRating,
                      setSearchQuery: setProfileQuery,
                      setSelectedStatus: setProfileStatusFilter,
                      setSelectedCategory: setProfileCategoryFilter,
                      setSelectedYear: setProfileYearFilter,
                      setMinRating: setProfileMinRating,
                    }}
                  />

                  {profileAnime.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-dark-700 bg-dark-900/40 p-8 text-center text-dark-300">
                      <p className="font-semibold text-dark-50 mb-1">
                        No anime here yet
                      </p>
                      <p className="text-sm">
                        This profile has not added any titles to their
                        collection.
                      </p>
                    </div>
                  ) : (
                    <AnimeCardGrid
                      anime={filteredProfileAnime}
                      densityOverride="superCondensed"
                    />
                  )}
                </motion.section>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-dark-900/80 border-b border-accent-blue/20"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-accent-blue hover:text-accent-blue/70 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft size={20} />
            Back to Tracker
          </button>
          <h2 className="text-xl font-bold text-dark-50">Profile Settings</h2>
          <div className="w-20"></div>
        </div>
      </motion.div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-600/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-xl backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-600/20 border border-green-500/50 text-green-200 px-6 py-3 rounded-xl backdrop-blur-sm flex items-center gap-2"
          >
            <Check size={18} /> {success}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Avatar & Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 card-base p-8 text-center"
          >
            <div className="relative inline-block mb-6">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover border-2 border-accent-blue"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-full flex items-center justify-center border-2 border-accent-blue">
                  <User size={48} className="text-white" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-accent-blue hover:bg-accent-purple p-2 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110">
                <Camera size={16} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {profile?.username || "Not Set"}
            </h1>
            <p className="text-dark-300 text-sm mb-6 break-all">
              {user?.email}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg px-4 py-2 font-semibold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Username Section */}
            <div className="card-base p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Display Username
                </h2>
                {!isEditing && profile?.username && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-accent-blue hover:text-blue-400 transition-colors transform hover:scale-110"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      checkUsername(e.target.value);
                    }}
                    placeholder="Enter username"
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-dark-50 placeholder-dark-400 focus:border-accent-blue focus:outline-none transition-colors"
                  />
                  <div className="flex gap-3 text-sm">
                    {isChecking && <p className="text-dark-300">Checking...</p>}
                    {isAvailable === true && (
                      <p className="text-green-400 flex items-center gap-1">
                        <Check size={14} /> Available
                      </p>
                    )}
                    {isAvailable === false && (
                      <p className="text-red-400 flex items-center gap-1">
                        <X size={14} /> Taken
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveUsername}
                      disabled={!isAvailable || !newUsername.trim()}
                      className="flex-1 bg-accent-blue hover:bg-blue-600 disabled:bg-dark-700 disabled:text-dark-400 text-white rounded-lg px-4 py-2 font-semibold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105 disabled:hover:scale-100"
                    >
                      <Check size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNewUsername(profile?.username || "");
                        setError("");
                        setIsAvailable(null);
                      }}
                      className="flex-1 bg-dark-800 hover:bg-dark-700 text-white rounded-lg px-4 py-2 font-semibold transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-105"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
                  <p className="text-accent-blue font-mono text-lg">
                    {profile?.username || "Not set"}
                  </p>
                  {!profile?.username && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-3 text-sm text-accent-blue hover:text-blue-400 transition-colors"
                    >
                      Set a username →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="card-base p-8">
              <h2 className="text-xl font-semibold text-white mb-6">
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-dark-300 mb-2 block">
                    Email Address
                  </label>
                  <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                    <p className="text-white font-mono">{user?.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-300 mb-2 block">
                    Member Since
                  </label>
                  <div className="bg-dark-800 rounded-lg p-3 border border-dark-700">
                    <p className="text-white">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-base p-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                Profile Bio
              </h2>
              <p className="text-dark-400 text-sm mb-3">
                A short bio or public notes that appear on your profile page.
              </p>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell people about yourself..."
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-dark-50 placeholder-dark-400 focus:border-accent-blue focus:outline-none transition-colors"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSaveBio}
                  className="flex-1 bg-accent-blue hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold transition-all duration-300"
                >
                  Save Bio
                </button>
                <button
                  onClick={() => setBio(profile?.bio || "")}
                  className="flex-1 bg-dark-800 hover:bg-dark-700 text-white rounded-lg px-4 py-2 font-semibold transition-all duration-300"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
