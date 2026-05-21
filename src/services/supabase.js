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
  const { data, error } = await supabase
    .from("anime_entries")
    .insert([entry])
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
  const { data, error } = await supabase
    .from("anime_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
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
    // Use upsert so it doesn't fail if row already exists
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          username: username.toLowerCase(),
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
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    console.log("Uploading avatar to:", fileName);

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(uploadError.message || "Failed to upload to storage");
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(fileName);
    console.log("Avatar public URL:", data.publicUrl);

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
