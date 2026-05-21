const getBookmarksKey = (userId) => `anime-tracker:profile-pages:${userId}`;

let _supabase = null;
const getSupabase = async () => {
  if (_supabase) return _supabase;
  try {
    const mod = await import("./supabase.js");
    _supabase = mod.supabase;
    return _supabase;
  } catch (err) {
    console.warn(
      "Supabase not available for bookmarks sync",
      err?.message || err,
    );
    _supabase = null;
    return null;
  }
};

const readState = (userId) => {
  if (!userId || typeof window === "undefined")
    return { folders: [], bookmarks: [] };

  try {
    const raw = window.localStorage.getItem(getBookmarksKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return { folders: [], bookmarks: [] };
    // Backwards-compat: old format was an array of bookmarks
    if (Array.isArray(parsed)) {
      return {
        folders: [],
        bookmarks: parsed.map((b) => ({ ...b, folderId: null })),
      };
    }
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    };
  } catch (error) {
    console.error("Error reading bookmarked pages state:", error);
    return { folders: [], bookmarks: [] };
  }
};

const writeState = (userId, state) => {
  if (!userId || typeof window === "undefined") return state;
  const normalized = {
    folders: Array.isArray(state.folders) ? state.folders : [],
    bookmarks: Array.isArray(state.bookmarks) ? state.bookmarks : [],
  };
  window.localStorage.setItem(
    getBookmarksKey(userId),
    JSON.stringify(normalized),
  );
  try {
    // notify other windows/components that bookmarks changed
    window.dispatchEvent(new CustomEvent("profileBookmarks:updated", { detail: { userId } }));
  } catch (err) {
    // ignore
  }
  return normalized;
};

export const getProfileBookmarks = (userId) => readState(userId).bookmarks;

export const getProfileFolders = (userId) => readState(userId).folders;

export const isProfileBookmarked = (userId, profileId) =>
  readState(userId).bookmarks.some((bookmark) => bookmark.id === profileId);

export const toggleProfileBookmark = (userId, profile, folderId = null) => {
  if (!userId || !profile?.id) return [];

  const state = readState(userId);
  const { bookmarks } = state;
  const exists = bookmarks.some((b) => b.id === profile.id);

  const updatedBookmarks = exists
    ? bookmarks.filter((b) => b.id !== profile.id)
    : [
        {
          id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url || "",
          created_at: profile.created_at || "",
          bookmarked_at: new Date().toISOString(),
          folderId: folderId || null,
        },
        ...bookmarks,
      ];

  const newState = writeState(userId, {
    ...state,
    bookmarks: updatedBookmarks,
  });
  // attempt server sync (fire-and-forget)
  writeServerBookmark(userId, profile, !exists, folderId).catch(() => {});
  return newState;
};

// Fire-and-forget: attempt to persist bookmark to Supabase when available
const writeServerBookmark = async (
  userId,
  profile,
  add = true,
  folderId = null,
) => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    if (!add) {
      const { error } = await supabase
        .from("profile_bookmarks")
        .delete()
        .match({ user_id: userId, profile_id: profile.id });
      if (error) throw error;
      return null;
    }

    const { data, error } = await supabase
      .from("profile_bookmarks")
      .insert(
        [
          {
            user_id: userId,
            profile_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url || "",
            created_at: profile.created_at || null,
            bookmarked_at: new Date().toISOString(),
            folder_id: folderId || null,
          },
        ],
        { upsert: false },
      )
      .select();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (err) {
    console.error("Error writing bookmark to server:", err?.message || err);
    return null;
  }
};

export const fetchServerBookmarks = async (userId) => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profile_bookmarks")
      .select(
        "profile_id, username, avatar_url, created_at, bookmarked_at, folder_id",
      )
      .eq("user_id", userId)
      .order("bookmarked_at", { ascending: false });

    if (error && error.code !== "PGRST116") throw error;
    if (!data) return [];
    return data.map((d) => ({
      id: d.profile_id,
      username: d.username,
      avatar_url: d.avatar_url,
      created_at: d.created_at,
      bookmarked_at: d.bookmarked_at,
      folderId: d.folder_id || null,
    }));
  } catch (err) {
    console.error("Error fetching bookmarks from server:", err?.message || err);
    return null;
  }
};

export const removeProfileBookmark = (userId, profileId) => {
  if (!userId || !profileId) return [];
  const state = readState(userId);
  const bookmarks = state.bookmarks.filter(
    (bookmark) => bookmark.id !== profileId,
  );
  const newState = writeState(userId, { ...state, bookmarks });
  writeServerBookmark(userId, { id: profileId }, false).catch(() => {});
  return newState;
};

export const createFolder = (userId, name) => {
  if (!userId || !name) return [];
  const state = readState(userId);
  const id = `f_${Date.now()}`;
  const folder = { id, name };
  const folders = [folder, ...state.folders];
  writeState(userId, { ...state, folders });
  return folders;
};

export const deleteFolder = (userId, folderId) => {
  if (!userId || !folderId) return [];
  const state = readState(userId);
  const folders = state.folders.filter((f) => f.id !== folderId);
  const bookmarks = state.bookmarks.map((b) =>
    b.folderId === folderId ? { ...b, folderId: null } : b,
  );
  writeState(userId, { folders, bookmarks });
  return folders;
};

export const moveBookmarkToFolder = (userId, profileId, folderId) => {
  if (!userId || !profileId) return [];
  const state = readState(userId);
  const bookmarks = state.bookmarks.map((b) =>
    b.id === profileId ? { ...b, folderId: folderId || null } : b,
  );
  writeState(userId, { ...state, bookmarks });
  return bookmarks;
};

export const getBookmarksByFolder = (userId, folderId) =>
  readState(userId).bookmarks.filter((b) => b.folderId === folderId);
