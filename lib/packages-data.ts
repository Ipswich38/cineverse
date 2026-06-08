import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { PACKAGES_TABLE, hasSupabase, supabaseAdmin } from "./supabase";
import { PACKAGE_OFFERS } from "./package-offers";
import type { PackageOffer } from "./package-offers";

// Cache tag for the package catalog. Admin writes call revalidateTag(PACKAGES_TAG)
// so the next read refetches from the database — pricing edits show up on the
// site automatically. Mirrors lib/catalog-data.ts for gear.
export const PACKAGES_TAG = "packages";

type Row = {
  id: string;
  slug: string;
  name: string;
  eyebrow: string | null;
  price_range: string | null;
  price_per_day: number | null;
  description: string | null;
  inclusions: unknown;
  details: unknown;
  best_for: string | null;
  review_notes: unknown;
  related_item_slugs: unknown;
  sort_order: number | null;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

function rowToOffer(r: Row): PackageOffer {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    eyebrow: r.eyebrow ?? "",
    priceRange: r.price_range ?? "",
    pricePerDay: Number(r.price_per_day ?? 0),
    description: r.description ?? "",
    inclusions: arr(r.inclusions),
    details: arr(r.details),
    bestFor: r.best_for ?? "",
    reviewNotes: arr(r.review_notes),
    relatedItemSlugs: arr(r.related_item_slugs),
    sortOrder: Number(r.sort_order ?? 0),
  };
}

// Map a PackageOffer (admin form) to a database row for writes. `sortOrder` keeps
// the storefront ordering stable; it carries on the offer as an optional field.
export function offerToRow(offer: PackageOffer) {
  return {
    id: offer.id,
    slug: offer.slug,
    name: offer.name,
    eyebrow: offer.eyebrow,
    price_range: offer.priceRange,
    price_per_day: offer.pricePerDay,
    description: offer.description,
    inclusions: offer.inclusions ?? [],
    details: offer.details ?? [],
    best_for: offer.bestFor,
    review_notes: offer.reviewNotes ?? [],
    related_item_slugs: offer.relatedItemSlugs ?? [],
    is_active: true,
    sort_order: offer.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

async function fetchPackages(): Promise<PackageOffer[]> {
  if (!hasSupabase()) return PACKAGE_OFFERS;
  const db = supabaseAdmin();
  if (!db) return PACKAGE_OFFERS;
  try {
    const { data, error } = await db
      .from(PACKAGES_TABLE)
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return PACKAGE_OFFERS; // graceful fallback
    return (data as Row[]).map(rowToOffer);
  } catch {
    return PACKAGE_OFFERS;
  }
}

// Cached package read. Hits Supabase only on a cache miss or after the tag is
// invalidated by an admin write; otherwise serves the cached result.
export const getPackagesCached = unstable_cache(fetchPackages, ["vissionlink-packages"], {
  tags: [PACKAGES_TAG],
  revalidate: 60,
});

// A package rents as a cart line with id `pkg-<offer.id>`; resolve the live offer
// (authoritative price) at checkout. DB-backed counterpart of packageByCartId.
export async function packageByCartIdLive(cartItemId: string): Promise<PackageOffer | undefined> {
  if (!cartItemId.startsWith("pkg-")) return undefined;
  const id = cartItemId.slice(4);
  const packages = await getPackagesCached();
  return packages.find((offer) => offer.id === id);
}

// Purge the package cache after an admin write so the next read refetches.
export function purgePackages() {
  try {
    revalidateTag(PACKAGES_TAG, "max");
  } catch {
    /* falls back to time-based revalidation */
  }
}
