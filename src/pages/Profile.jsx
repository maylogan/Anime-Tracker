import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  LogOut,
  User,
  Edit2,
  Check,
  X,
  Camera,
  Upload,
} from "lucide-react";
import { useAuthStore } from "../store/store";
import {
  supabase,
  getUserProfile,
  updateUserProfile,
  checkUsernameAvailable,
  uploadAvatar,
} from "../services/supabase";

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const prof = await getUserProfile(user.id);
        setProfile(prof);
        setNewUsername(prof?.username || "");
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    };

    loadProfile();
  }, [user, navigate]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

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
          </motion.div>
        </div>
      </main>
    </div>
  );
};
