import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { searchUsers } from "../services/supabase";

export const UserSearch = ({ onUserSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const users = await searchUsers(value);
      setResults(users);
      setIsOpen(true);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-dark-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={handleSearch}
          onFocus={() => query && setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-3 text-dark-400 hover:text-dark-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-dark-400">Searching...</div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-dark-700">
                {results.map((user) => (
                  <motion.button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    whileHover={{ backgroundColor: "#1a1f27" }}
                    className="w-full p-3 text-left flex items-center gap-3 transition-colors hover:bg-dark-700"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent-blue">
                          {user.username[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-dark-50">
                        {user.username}
                      </p>
                      <p className="text-xs text-dark-400">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="p-4 text-center text-dark-400">
                No users found
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
