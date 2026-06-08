import { NextResponse } from "next/server";
import { getPackagesCached } from "@/lib/packages-data";

export const runtime = "nodejs";

// Public package feed. The data is cached (unstable_cache, tag "packages"), so the
// database is hit only on a cache miss or after an admin edit invalidates the tag.
export async function GET() {
  const packages = await getPackagesCached();
  return NextResponse.json(packages);
}
