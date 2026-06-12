// ── Live crew rates (Cineforce → VissionLink checkout) ────────────────────────
// VissionLink bills crew at a FLAT rate per position. Until Cineforce freelancer
// listings go live, the bundled RECOMMENDED rates (lib/cineforce-crew.ts) apply.
// Once positions are filled on Cineforce, its sync writes the live per-position
// rate into public.vissionlink_crew_rates (supabase/crew-rates.sql) and this
// resolver automatically serves it instead — no code change needed. Server-only.
import { hasSupabase, supabaseAdmin } from "./supabase";
import { CREW_POSITIONS, type CrewPosition, type CrewRateSource } from "./cineforce-crew";

export type LiveCrewPosition = CrewPosition & { source: CrewRateSource };

const TABLE = "vissionlink_crew_rates";
const TTL_MS = 60_000;
let cache: { at: number; data: LiveCrewPosition[] } | null = null;

export async function getLiveCrewPositions(): Promise<LiveCrewPosition[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const overrides = new Map<string, number>();
  if (hasSupabase()) {
    try {
      const { data } = await supabaseAdmin()!.from(TABLE).select("position_key,daily_rate,active");
      for (const r of data ?? []) {
        const rate = Math.round(Number(r.daily_rate) || 0);
        if (r.active !== false && rate > 0) overrides.set(String(r.position_key), rate);
      }
    } catch {
      // table missing / DB down → recommended rates remain the source of truth
    }
  }

  const merged: LiveCrewPosition[] = CREW_POSITIONS.map((p) =>
    overrides.has(p.key)
      ? { ...p, dailyRate: overrides.get(p.key)!, source: "cineforce" }
      : { ...p, source: "recommended" },
  );
  cache = { at: Date.now(), data: merged };
  return merged;
}

export async function getCrewRatesByKey(): Promise<Record<string, number>> {
  const positions = await getLiveCrewPositions();
  return Object.fromEntries(positions.map((p) => [p.key, p.dailyRate]));
}
