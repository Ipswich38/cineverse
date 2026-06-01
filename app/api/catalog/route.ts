import { NextResponse } from "next/server";
import { getCatalogCached } from "@/lib/catalog-data";

export const runtime = "nodejs";

// Public catalog feed. The data is cached (unstable_cache, tag "catalog"), so the
// database is hit only on a cache miss or after an admin edit invalidates the tag.
export async function GET() {
  const catalog = await getCatalogCached();
  return NextResponse.json(catalog);
}
