import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const addAnimeEntry = async (entry) => {
  // Avoid sending keys with null/undefined values that might not exist in DB schema
  const payload = { ...entry };
  if (
    payload.audience_rating === null ||
    payload.audience_rating === undefined
  ) {
    delete payload.audience_rating;
  }

  const { data, error } = await supabase
    .from("anime_entries")
    .insert([payload])
    .select();

  if (error) throw error;
  return data?.[0];
};

export const getAnimeEntries = async (userId) => {
  const { data, error } = await supabase
    .from("anime_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const updateAnimeEntry = async (id, updates) => {
  const payload = { ...updates };
  if (
    payload.audience_rating === null ||
    payload.audience_rating === undefined
  ) {
    delete payload.audience_rating;
  }

  const { data, error } = await supabase
    .from("anime_entries")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) throw error;
  return data?.[0];
};

export const deleteAnimeEntry = async (id) => {
  const { error } = await supabase.from("anime_entries").delete().eq("id", id);

  if (error) throw error;
};

export const subscribeToAnimeEntries = (userId, callback) => {
  // Real-time subscriptions disabled - not required for basic functionality
  // The app works perfectly fine with page refresh to see updates
  return {
    unsubscribe: () => {},
  };
};

// User profile functions
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data;
  } catch (err) {
    // Table doesn't exist yet, return null
    if (err.message?.includes("404")) return null;
    throw err;
  }
};

export const getUserProfileByUsername = async (username) => {
  if (!username) return null;

  const normalizedUsername = username.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  } catch (err) {
    if (err.message?.includes("404")) return null;
    throw err;
  }
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

const normalizeFallbackUsername = (value, userId) => {
  const cleaned = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return cleaned || `user-${userId.slice(0, 8)}`;
};

export const getUserProfileByIdentifier = async (identifier) => {
  if (!identifier) return null;

  const trimmedIdentifier = identifier.trim();

  if (isUuid(trimmedIdentifier)) {
    const byId = await getUserProfile(trimmedIdentifier);
    if (byId) return byId;
  }

  return getUserProfileByUsername(trimmedIdentifier);
};

export const createUserProfile = async (userId, username) => {
  try {
    const resolvedUsername = username?.trim() || `user-${userId.slice(0, 8)}`;

    // Use upsert so it doesn't fail if row already exists
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          username: resolvedUsername.toLowerCase(),
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select();

    if (error) {
      console.error("Supabase createUserProfile error:", error);
      throw error;
    }
    return data?.[0];
  } catch (err) {
    console.error("createUserProfile error:", err);
    if (err.message?.includes("404")) {
      console.warn(
        "user_profiles table not found. Run: node setup-profiles.js",
      );
      return { id: userId, username };
    }
    throw err;
  }
};

export const ensureUserProfile = async (user) => {
  if (!user?.id) return null;

  const existingProfile = await getUserProfile(user.id);
  if (existingProfile) return existingProfile;

  const fallbackUsername = normalizeFallbackUsername(
    user.user_metadata?.username ||
      user.user_metadata?.name ||
      user.email?.split("@")[0],
    user.id,
  );

  return createUserProfile(user.id, fallbackUsername);
};

export const updateUserProfile = async (userId, updates) => {
  try {
    // Normalize username to lowercase for consistency
    const normalizedUpdates = updates.username
      ? { ...updates, username: updates.username.toLowerCase() }
      : updates;

    // Try upsert: update if exists, insert if not
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          ...normalizedUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select();

    if (error) {
      console.error("Supabase updateUserProfile error:", error);
      throw new Error(error.message || "Failed to update profile");
    }
    return data?.[0];
  } catch (err) {
    console.error("updateUserProfile error:", err);
    if (err.message?.includes("404")) {
      console.warn(
        "user_profiles table not found. Run: node setup-profiles.js",
      );
      return { id: userId, ...updates };
    }
    throw err;
  }
};

export const checkUsernameAvailable = async (username) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    console.log(`Username "${username}" check - exists:`, !!data);
    return !data; // Returns true if username is available
  } catch (err) {
    console.error("Error checking username:", err);
    if (err.message?.includes("404")) {
      return true; // Assume available if table doesn't exist
    }
    throw err;
  }
};

export const uploadAvatar = async (userId, file) => {
  try {
    // Client-side validation: restrict types and size
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    const maxBytes = 2 * 1024 * 1024; // 2MB

    if (!file || !file.type) throw new Error("No file provided");
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Allowed: PNG, JPEG, WEBP");
    }
    if (file.size > maxBytes) {
      throw new Error("File too large. Max size is 2MB");
    }

    // Optional: check image dimensions in browser (best-effort)
    const checkImageDims = () =>
      new Promise((resolve, reject) => {
        try {
          const img = new Image();
          img.onload = () => {
            // Prevent extremely large images (dimensions > 4000px)
            if (img.width > 4000 || img.height > 4000) {
              reject(new Error("Image dimensions too large (max 4000px)"));
              return;
            }
            resolve();
          };
          img.onerror = () => reject(new Error("Failed to read image"));
          img.src = URL.createObjectURL(file);
        } catch (err) {
          // If anything goes wrong, don't block upload — server will validate
          resolve();
        }
      });

    if (typeof window !== "undefined") {
      await checkImageDims();
    }

    // If a secure upload endpoint is configured (e.g. Vercel Edge Function), use it
    const uploadFn = import.meta.env.VITE_UPLOAD_FUNCTION_URL;
    if (uploadFn) {
      const fd = new FormData();
      fd.append("avatar", file);
      fd.append("userId", userId);

      const res = await fetch(uploadFn, {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json && json.message) || "Upload failed on server");
      }

      // Server returns a signed public URL (or path) in `publicUrl`
      const publicUrl = json?.publicUrl;
      if (publicUrl) {
        await updateUserProfile(userId, { avatar_url: publicUrl });
        return publicUrl;
      }
      throw new Error("Upload succeeded but no public URL returned");
    }

    // Fallback: directly upload using anon key (not recommended for production)
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    console.warn(
      "No upload endpoint configured (VITE_UPLOAD_FUNCTION_URL). Falling back to direct upload with anon key. Consider deploying a server-side upload function and set VITE_UPLOAD_FUNCTION_URL.",
    );

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(uploadError.message || "Failed to upload to storage");
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(fileName);
    await updateUserProfile(userId, { avatar_url: data.publicUrl });
    return data.publicUrl;
  } catch (err) {
    console.error("Avatar upload error:", err.message || err);
    throw err;
  }
};

export const searchUsers = async (query) => {
  try {
    console.log("Starting user search for:", query);

    // First, try a simple query to see if we get ANY data
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url, created_at");

    console.log("All users in DB:", data?.length || 0, "Error:", error);

    // Now do the filtered search
    const { data: filtered, error: filterError } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url, created_at")
      .ilike("username", `%${query}%`)
      .limit(10);

    if (filterError && filterError.code !== "PGRST116") {
      console.error("Filter error:", filterError);
      throw filterError;
    }

    console.log(
      `Search for "${query}" - Found ${(filtered || []).length} users:`,
      filtered?.slice(0, 3),
    );
    return filtered || [];
  } catch (err) {
    console.error("Error searching users:", err);
    if (err.message?.includes("404")) {
      return [];
    }
    throw err;
  }
};
