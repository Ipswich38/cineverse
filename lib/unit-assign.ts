// ── Unit auto-assignment ─────────────────────────────────────────────────────
// Match a contract's equipment lines to physical units in inventory so the right
// gear is reserved against a rental. Pure functions — the API route loads the
// units + contract, runs planAssignment, then commits the result. Matching is
// fuzzy (free-text line descriptions vs. free-text unit names/categories), so we
// score by token overlap and only claim a unit when the score clears a floor.

export type AssignLine = { id: string; description: string; qty: number };

export type AssignUnit = {
  id: string;
  name: string;
  category: string | null;
  status: "available" | "rented" | "maintenance" | "retired";
  assigned_request_id: string | null;
};

export type LinePlan = {
  lineId: string;
  description: string;
  qty: number;
  unitIds: string[]; // units chosen for this line
  shortfall: number; // qty not coverable from inventory
};

export type AssignmentPlan = {
  lines: LinePlan[];
  assignUnitIds: string[]; // all units to mark rented for this request
  releaseUnitIds: string[]; // units currently on this request but no longer needed
  totalRequested: number;
  totalAssigned: number;
  totalShortfall: number;
};

// Minimum overlap score for a unit to be considered a match for a line. Token
// overlap is measured against the line's tokens, so this means "at least this
// fraction of the line's words are present in the unit name/category".
export const MATCH_FLOOR = 0.5;

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "for", "with", "per", "day", "days", "set", "kit", "unit", "units", "pc", "pcs", "x"]);

export function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// Fraction of the line's tokens that appear in the unit's text (name+category).
// Asymmetric on purpose: a generic line ("camera") should match a specific unit
// ("RED Komodo camera body"), but a line shouldn't need every unit word.
export function matchScore(line: string, unit: AssignUnit): number {
  const lineTokens = tokenize(line);
  if (lineTokens.length === 0) return 0;
  const unitTokens = new Set([...tokenize(unit.name), ...tokenize(unit.category || "")]);
  if (unitTokens.size === 0) return 0;
  let hits = 0;
  for (const t of lineTokens) if (unitTokens.has(t)) hits++;
  return hits / lineTokens.length;
}

// Build an assignment plan for a request. Units already assigned to this request
// are treated as a free pool (so re-running is stable and doesn't double-book).
// Every other "available" unit is eligible; rented/maintenance/retired are not.
export function planAssignment(lines: AssignLine[], units: AssignUnit[], requestId: string): AssignmentPlan {
  const mine = (u: AssignUnit) => u.assigned_request_id === requestId;
  // Pool of units we can hand out: available ones + anything currently on this
  // request (we may keep or release those).
  const pool = units.filter((u) => (u.status === "available" && !u.assigned_request_id) || mine(u));
  const taken = new Set<string>();
  const linePlans: LinePlan[] = [];

  for (const line of lines) {
    const qty = Math.max(0, Math.floor(Number(line.qty) || 0));
    if (qty === 0) {
      linePlans.push({ lineId: line.id, description: line.description, qty: 0, unitIds: [], shortfall: 0 });
      continue;
    }
    // Score every untaken pool unit; prefer higher score, then units already on
    // this request (keeps existing assignments stable), then by name.
    const ranked = pool
      .filter((u) => !taken.has(u.id))
      .map((u) => ({ u, score: matchScore(line.description, u) }))
      .filter((r) => r.score >= MATCH_FLOOR)
      .sort((a, b) => b.score - a.score || Number(mine(b.u)) - Number(mine(a.u)) || a.u.name.localeCompare(b.u.name));

    const chosen = ranked.slice(0, qty).map((r) => r.u.id);
    chosen.forEach((id) => taken.add(id));
    linePlans.push({
      lineId: line.id,
      description: line.description,
      qty,
      unitIds: chosen,
      shortfall: qty - chosen.length,
    });
  }

  const assignUnitIds = Array.from(taken);
  const releaseUnitIds = units.filter((u) => mine(u) && !taken.has(u.id)).map((u) => u.id);
  const totalRequested = linePlans.reduce((s, l) => s + l.qty, 0);
  const totalAssigned = assignUnitIds.length;

  return {
    lines: linePlans,
    assignUnitIds,
    releaseUnitIds,
    totalRequested,
    totalAssigned,
    totalShortfall: totalRequested - totalAssigned,
  };
}
