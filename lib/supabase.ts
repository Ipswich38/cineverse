import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase access for the gear catalog. The service-role client is
// never imported into client components (it would leak the key). Catalog reads
// happen server-side behind a cache; writes happen in admin route handlers.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const EQUIPMENT_TABLE = "vissionlink_equipment";
export const PACKAGES_TABLE = "vissionlink_packages";

export function hasSupabase() {
  return Boolean(url && serviceKey);
}

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  if (cached) return cached;
  cached = createClient(url as string, serviceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
