import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, ArrowLeft, ArrowRight } from "lucide-react";
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <div className="w-20">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-accent-blue hover:text-accent-blue/70 transition-all duration-300"
            >
              <ArrowLeft size={18} /> Back
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <h2 className="text-xl font-bold text-dark-50 flex items-center gap-2">
              <Bookmark size={18} /> Bookmarks
            </h2>
          </div>

          <div className="w-48">
            <UserSearch
              onUserSelect={(u) => navigate(`/profile/${u.username}`)}
            />
          </div>
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
            <div className="text-dark-400 text-sm">
              {bookmarks.length} saved
            </div>
          </div>

          {bookmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-dark-700 bg-dark-900/40 p-6 text-dark-300">
              No pages bookmarked yet, search and follow a profile to add them!
              here.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarks.map((b) => (
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
              No recent activity from followed pages.
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
