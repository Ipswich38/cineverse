// ── Coarse geo-IP lookup ──────────────────────────────────────────────────────
// Best-effort city/region/country for an order's request IP, so the admin can
// see roughly where a booking came from. Server-only. Never throws — a lookup
// failure (timeout, rate-limit, private IP) just yields null and must never
// block or fail checkout.

// The first public IP from an X-Forwarded-For chain (or X-Real-IP fallback).
export function clientIpFromHeaders(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || null;
}

// Private / loopback / link-local ranges never resolve to a useful location.
function isPrivate(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  if (/^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

// Returns "City, Region, CC" (e.g. "Quezon City, Metro Manila, PH") or null.
export async function lookupLocation(ip: string | null): Promise<string | null> {
  if (!ip || isPrivate(ip)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { city?: string; region?: string; country_code?: string; error?: boolean };
    if (d.error) return null;
    const parts = [d.city, d.region, d.country_code].filter((p): p is string => Boolean(p && p.trim()));
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null; // timeout / network / rate-limit — best-effort only
  } finally {
    clearTimeout(timer);
  }
}
