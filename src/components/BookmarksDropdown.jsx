import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import {
  getProfileBookmarks,
  getProfileFolders,
  createFolder,
  deleteFolder,
  removeProfileBookmark,
  moveBookmarkToFolder,
  getBookmarksByFolder,
} from "../services/profileBookmarks";
import { useAuthStore } from "../store/store";
import { useNavigate } from "react-router-dom";

export const BookmarksDropdown = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [newFolder, setNewFolder] = useState("");

  useEffect(() => {
    if (!user) return;
    setFolders(getProfileFolders(user.id));
    setBookmarks(getProfileBookmarks(user.id));
  }, [user]);

  const refresh = () => {
    if (!user) return;
    setFolders(getProfileFolders(user.id));
    setBookmarks(getProfileBookmarks(user.id));
  };

  const handleCreateFolder = () => {
    if (!newFolder.trim()) return;
    createFolder(user.id, newFolder.trim());
    setNewFolder("");
    refresh();
  };

  const handleDeleteFolder = (id) => {
    deleteFolder(user.id, id);
    refresh();
  };

  const handleUnsave = (id) => {
    removeProfileBookmark(user.id, id);
    refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((s) => !s)}
        className="bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-accent-blue text-dark-50 rounded-lg px-3 py-2 font-semibold flex items-center gap-2 transition-all duration-300"
        title="Bookmarks"
      >
        <Bookmark size={16} />
        Bookmarks
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-80 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 p-3"
        >
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="New folder"
                className="flex-1 bg-dark-900 border border-dark-700 px-3 py-2 rounded-lg"
              />
              <button onClick={handleCreateFolder} className="btn-primary">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {folders.length === 0 ? (
                <div className="text-dark-400 text-sm">No folders</div>
              ) : (
                folders.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setBookmarks(getBookmarksByFolder(user.id, f.id))
                      }
                      className="px-3 py-1 bg-dark-700 rounded text-sm"
                    >
                      {f.name}
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(f.id)}
                      className="text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-dark-700">
            {(bookmarks || []).length === 0 ? (
              <div className="text-dark-400 text-sm p-2">No saved profiles</div>
            ) : (
              (bookmarks || []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-2">
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={b.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-sm">
                      {b.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <button
                      onClick={() => {
                        navigate(`/profile/${b.username}`);
                        setIsOpen(false);
                      }}
                      className="font-semibold text-dark-50"
                    >
                      {b.username}
                    </button>
                    <div className="text-xs text-dark-400">
                      Saved {new Date(b.bookmarked_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUnsave(b.id)}
                      className="text-red-500"
                    >
                      Unsave
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
