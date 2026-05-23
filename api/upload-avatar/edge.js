import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const form = await req.formData();
    const avatar = form.get("avatar");
    const userId = form.get("userId");

    if (!avatar || !userId) {
      return new Response(
        JSON.stringify({ message: "Missing avatar or userId" }),
        { status: 400 },
      );
    }

    // Validate file type and size
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    const maxBytes = 2 * 1024 * 1024; // 2MB
    const contentType = avatar.type || "application/octet-stream";
    if (!allowed.includes(contentType)) {
      return new Response(JSON.stringify({ message: "Invalid file type" }), {
        status: 400,
      });
    }
    const ab = await avatar.arrayBuffer();
    if (ab.byteLength > maxBytes) {
      return new Response(JSON.stringify({ message: "File too large" }), {
        status: 400,
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ message: "Server not configured" }),
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        global: { fetch },
      },
    );

    const fileName = `${userId}/${Date.now()}_${avatar.name || "avatar"}`;

    // upload
    const { error: uploadError } = await supabaseAdmin.storage
      .from("profiles")
      .upload(fileName, new Uint8Array(ab), { contentType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ message: uploadError.message || "Upload failed" }),
        { status: 500 },
      );
    }

    // create signed URL (7 days)
    const { data: signed } = await supabaseAdmin.storage
      .from("profiles")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    // update profile record server-side
    await supabaseAdmin
      .from("user_profiles")
      .update({ avatar_url: signed?.signedURL || null })
      .eq("id", userId);

    return new Response(
      JSON.stringify({ publicUrl: signed?.signedURL || null }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Edge upload error:", err);
    return new Response(
      JSON.stringify({ message: err.message || "Internal error" }),
      { status: 500 },
    );
  }
}
