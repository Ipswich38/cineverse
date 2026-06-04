import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

// Public bucket holding listing photos. The admin uploads here; the storefront
// reads the returned public URLs. Writes are service-role + Bearer-gated (admin only).
const BUCKET = "equipment-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

// Accepts a single image file (multipart `file`) and returns its public URL.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const db = supabaseAdmin()!;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });

  // Make sure the bucket exists (idempotent — created once, public-read).
  const { data: existing } = await db.storage.getBucket(BUCKET);
  if (!existing) {
    const { error: bucketErr } = await db.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    // Ignore "already exists" races; surface anything else.
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      return NextResponse.json({ error: bucketErr.message }, { status: 500 });
    }
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
