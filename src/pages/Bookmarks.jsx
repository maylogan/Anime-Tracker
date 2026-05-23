import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { useAuthStore } from "../store/store";
import {
  getProfileBookmarks,
  getProfileFolders,
  fetchServerBookmarks,
} from "../services/profileBookmarks";
import { getAnimeEntries } from "../services/supabase";
import { useNavigate } from "react-router-dom";
import { UserSearch } from "../components/UserSearch";

export const Bookmarks = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pageQuery, setPageQuery] = useState("");

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    const query = pageQuery.trim().toLowerCase();
    if (!query) return true;

    const username = (bookmark.username || "").toLowerCase();
    const folderName = (
      folders.find((folder) => folder.id === bookmark.folderId)?.name || ""
    ).toLowerCase();

    return username.includes(query) || folderName.includes(query);
  });

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const load = async () => {
      try {
        const server = await fetchServerBookmarks(user.id);
        if (isMounted && Array.isArray(server)) {
          setBookmarks(server);
        } else if (isMounted) {
          setBookmarks(getProfileBookmarks(user.id));
        }
      } catch (err) {
        if (isMounted) setBookmarks(getProfileBookmarks(user.id));
      }
      if (isMounted) setFolders(getProfileFolders(user.id));
    };
    load();
    const onUpdated = async (e) => {
      if (!user) return;
      try {
        const server = await fetchServerBookmarks(user.id);
        if (Array.isArray(server)) setBookmarks(server);
        else setBookmarks(getProfileBookmarks(user.id));
      } catch (err) {
        setBookmarks(getProfileBookmarks(user.id));
      }
    };

    window.addEventListener("profileBookmarks:updated", onUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("profileBookmarks:updated", onUpdated);
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadActivity = async () => {
      if (!user || bookmarks.length === 0) return setActivity([]);
      try {
        const all = [];
        for (const p of bookmarks.slice(0, 10)) {
          try {
            const entries = await getAnimeEntries(p.id);
            (entries || []).forEach((e) => all.push({ profile: p, entry: e }));
          } catch (err) {}
        }
        const sorted = all
          .filter((x) => {
            const rating = x.entry?.rating;
            return (
              typeof rating === "number" &&
              rating > 0 &&
              (rating >= 9 || rating <= 2)
            );
          })
          .filter((x) => x.entry && x.entry.created_at)
          .sort(
            (a, b) =>
              new Date(b.entry.created_at) - new Date(a.entry.created_at),
          )
          .slice(0, 30);
        if (isMounted) setActivity(sorted);
      } catch (err) {
        console.error(err);
      }
    };
    loadActivity();
    return () => {
      isMounted = false;
    };
  }, [bookmarks, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 backdrop-blur-md bg-dark-900/80 border-b border-accent-blue/20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div className="w-20">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-accent-blue hover:text-accent-blue/70 transition-all duration-300"
            >
              <ArrowLeft size={18} /> Back
            </button>
          </div>

          <h2 className="text-xl font-bold text-dark-50">Bookmarks</h2>

          <div className="w-20" />
        </div>
      </motion.div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.section className="card-base p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-dark-50">
                Pages you follow
              </h3>
              <p className="text-dark-400 text-sm">
                Quick access to profiles you saved
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-64 hidden sm:block relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={pageQuery}
                  onChange={(e) => setPageQuery(e.target.value)}
                  placeholder="Search saved pages..."
                  className="w-full pl-9 pr-10 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-50 placeholder-dark-400 focus:outline-none focus:border-accent-blue transition-colors"
                />
                {pageQuery && (
                  <button
                    type="button"
                    onClick={() => setPageQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                    aria-label="Clear saved page search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="w-48 hidden sm:block">
                <UserSearch
                  onUserSelect={(u) => navigate(`/profile/${u.username}`)}
                />
              </div>
              <div className="text-dark-400 text-sm">
                {bookmarks.length} saved
              </div>
            </div>
          </div>

          {bookmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dark-700 bg-dark-900/40 p-6 text-dark-300">
              No pages bookmarked yet, search and follow a profile to add them!
              here.
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dark-700 bg-dark-900/40 p-6 text-dark-300">
              No saved pages match your search.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBookmarks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/profile/${b.username}`)}
                  className="group flex items-center gap-3 rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-3 text-left transition-colors hover:border-accent-blue/40 hover:bg-dark-800"
                >
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={b.username}
                      className="h-11 w-11 rounded-full object-cover border border-dark-600"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm font-bold text-white">
                      {b.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-dark-50 truncate">
                      {b.username}
                    </p>
                    <p className="text-xs text-dark-400 truncate">
                      Saved {new Date(b.bookmarked_at).toLocaleDateString()}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-dark-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-blue" />
                </button>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section className="card-base p-6">
          <h3 className="text-lg font-bold text-dark-50 mb-3">
            Recent activity
          </h3>
          {activity.length === 0 ? (
            <div className="text-dark-400">
              No recent 9+/2- ratings from followed pages.
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((it) => (
                <div
                  key={`${it.profile.id}-${it.entry.id}`}
                  className="flex items-start gap-3"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden">
                    {it.entry.poster_url ? (
                      <img
                        src={it.entry.poster_url}
                        alt={it.entry.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-dark-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <button
                          onClick={() =>
                            navigate(`/profile/${it.profile.username}`)
                          }
                          className="font-semibold text-dark-50"
                        >
                          {it.profile.username}
                        </button>
                        <p className="text-sm text-dark-300">
                          added{" "}
                          <span className="text-accent-blue">
                            {it.entry.title}
                          </span>
                          {typeof it.entry.rating === "number" && (
                            <span className="text-dark-400">
                              {" "}
                              rated {it.entry.rating}/10
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-dark-400">
                        {new Date(it.entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};
