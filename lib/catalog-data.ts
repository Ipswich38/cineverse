import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { EQUIPMENT_TABLE, hasSupabase, supabaseAdmin } from "./supabase";
import { INITIAL_CATALOG } from "./catalog";
import type { EquipmentItem } from "./catalog";

// Cache tag for the whole catalog. Admin writes call revalidateTag(CATALOG_TAG)
// so the next read refetches from the database — otherwise reads are served from
// cache and never touch Supabase (cheap + scalable).
export const CATALOG_TAG = "catalog";

type Row = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  owner: string | null;
  location: string | null;
  rate_per_day: number | null;
  security_deposit: number | null;
  stock: number | null;
  featured: boolean | null;
  images: unknown;
  specs: unknown;
  tags: unknown;
  unavailable: unknown;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function rowToItem(r: Row): EquipmentItem {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    description: r.description ?? "",
    owner: r.owner ?? "",
    location: r.location ?? "",
    ratePerDay: Number(r.rate_per_day ?? 0),
    securityDeposit: Number(r.security_deposit ?? 0),
    stock: Number(r.stock ?? 0),
    featured: Boolean(r.featured),
    images: arr(r.images),
    specs: arr(r.specs),
    tags: arr(r.tags),
    unavailable: Array.isArray(r.unavailable) ? (r.unavailable as { from: string; to: string }[]) : [],
  };
}

// Map an EquipmentItem (admin form) to a database row for writes.
export function itemToRow(item: EquipmentItem) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category,
    description: item.description,
    owner: item.owner,
    location: item.location,
    rate_per_day: item.ratePerDay,
    security_deposit: item.securityDeposit,
    stock: item.stock,
    featured: item.featured,
    images: item.images ?? [],
    specs: item.specs ?? [],
    tags: item.tags ?? [],
    unavailable: item.unavailable ?? [],
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

async function fetchCatalog(): Promise<EquipmentItem[]> {
  if (!hasSupabase()) return INITIAL_CATALOG;
  const db = supabaseAdmin();
  if (!db) return INITIAL_CATALOG;
  try {
    const { data, error } = await db
      .from(EQUIPMENT_TABLE)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return INITIAL_CATALOG; // graceful fallback
    return (data as Row[]).map(rowToItem);
  } catch {
    return INITIAL_CATALOG;
  }
}

// Cached catalog read. Hits Supabase only on a cache miss or after the tag is
// invalidated by an admin write; otherwise serves the cached result.
export const getCatalogCached = unstable_cache(fetchCatalog, ["vissionlink-catalog"], {
  tags: [CATALOG_TAG],
  revalidate: 60, // bounded staleness even if on-demand tag purge is a no-op
});

// Purge the catalog cache after an admin write. Guarded because the Next 16
// revalidateTag signature/behaviour depends on Cache Components being enabled;
// if it throws or no-ops, the short `revalidate` window above still applies.
export function purgeCatalog() {
  try {
    revalidateTag(CATALOG_TAG, "max");
  } catch {
    /* falls back to time-based revalidation */
  }
}
