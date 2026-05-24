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

const AVATAR_MAX_DIMENSION = 512;
const AVATAR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;

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
    return !data; // Returns true if username is available
  } catch (err) {
    console.error("Error checking username:", err);
    if (err.message?.includes("404")) {
      return true; // Assume available if table doesn't exist
    }
    throw err;
  }
};

const extractAvatarStoragePath = (avatarUrl, bucket = "profiles") => {
  if (!avatarUrl || typeof avatarUrl !== "string") return null;

  try {
    const parsedUrl = new URL(avatarUrl);
    const bucketMarker = `/${bucket}/`;
    const markerIndex = parsedUrl.pathname.indexOf(bucketMarker);
    if (markerIndex === -1) return null;

    const rawPath = parsedUrl.pathname.slice(markerIndex + bucketMarker.length);
    const normalized = decodeURIComponent(rawPath).replace(/^\/+/, "").trim();
    return normalized || null;
  } catch {
    const fallbackMatch = avatarUrl.match(new RegExp(`${bucket}/([^?]+)`));
    if (!fallbackMatch?.[1]) return null;
    return decodeURIComponent(fallbackMatch[1]).replace(/^\/+/, "").trim();
  }
};

const optimizeAvatarFile = async (file) => {
  if (typeof window === "undefined") return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to read image"));
      img.src = objectUrl;
    });

    const width = image.width || 0;
    const height = image.height || 0;

    if (!width || !height) {
      throw new Error("Invalid image dimensions");
    }

    if (width > 4000 || height > 4000) {
      throw new Error("Image dimensions too large (max 4000px)");
    }

    const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Failed to compress image"));
            return;
          }
          resolve(result);
        },
        "image/webp",
        0.82,
      );
    });

    const originalBaseName = (file.name || "avatar")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "");

    const optimizedFile = new File(
      [blob],
      `${originalBaseName || "avatar"}.webp`,
      {
        type: "image/webp",
        lastModified: Date.now(),
      },
    );

    // Keep original if optimization did not reduce size and no resize happened.
    if (scale === 1 && optimizedFile.size >= file.size) {
      return file;
    }

    return optimizedFile;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadAvatar = async (userId, file) => {
  try {
    // Client-side validation: restrict types and size
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!file || !file.type) throw new Error("No file provided");
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Allowed: PNG, JPEG, WEBP");
    }
    if (file.size > AVATAR_MAX_INPUT_BYTES) {
      throw new Error("File too large. Max input size is 10MB");
    }

    let uploadFile = file;
    try {
      uploadFile = await optimizeAvatarFile(file);
    } catch (optimizeError) {
      console.warn(
        "Avatar optimization failed, uploading original file:",
        optimizeError?.message || optimizeError,
      );
    }

    if (uploadFile.size > AVATAR_MAX_UPLOAD_BYTES) {
      throw new Error("Image is still too large after compression (max 2MB)");
    }

    // If a secure upload endpoint is configured (e.g. Vercel Edge Function), use it
    const uploadFn = import.meta.env.VITE_UPLOAD_FUNCTION_URL;
    if (uploadFn) {
      const fd = new FormData();
      fd.append("avatar", uploadFile);
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
    const existingProfile = await getUserProfile(userId);
    const previousAvatarPath = extractAvatarStoragePath(
      existingProfile?.avatar_url,
    );

    console.warn(
      "No upload endpoint configured (VITE_UPLOAD_FUNCTION_URL). Falling back to direct upload with anon key. Consider deploying a server-side upload function and set VITE_UPLOAD_FUNCTION_URL.",
    );

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(fileName, uploadFile, { upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(uploadError.message || "Failed to upload to storage");
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(fileName);
    await updateUserProfile(userId, { avatar_url: data.publicUrl });

    // Best-effort cleanup: keep the latest avatar and remove the previous object.
    if (previousAvatarPath && previousAvatarPath !== fileName) {
      const { error: removeError } = await supabase.storage
        .from("profiles")
        .remove([previousAvatarPath]);

      if (removeError) {
        console.warn("Previous avatar cleanup failed:", removeError.message);
      }
    }

    return data.publicUrl;
  } catch (err) {
    console.error("Avatar upload error:", err.message || err);
    throw err;
  }
};

export const searchUsers = async (query) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url, created_at");

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
    return filtered || [];
  } catch (err) {
    console.error("Error searching users:", err);
    if (err.message?.includes("404")) {
      return [];
    }
    throw err;
  }
};
