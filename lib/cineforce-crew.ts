// ── Cineforce crew-hire at rental checkout ────────────────────────────────────
// Single source of truth shared by the checkout UI and the server session route
// (rates are always re-resolved server-side — the client is never trusted).
//
// Policy: every rental either (a) hires BMR-designated crew to handle the gear —
// one MAIN handler + one ASSISTANT are mandatory, additional project crew is
// optional — or (b) waives the crew and signs the Equipment Rental Liability
// Waiver (rendered at checkout and as a PDF with the contract).
//
// Rates: VissionLink charges a FLAT rate per position — deliberately separate
// from what individual freelancers charge when hired directly on Cineforce.
// The dailyRate below is the RECOMMENDED rate shown until Cineforce freelancer
// listings go live; once positions are filled there, live per-position rates
// flow into the vissionlink_crew_rates table (see lib/crew-rates.ts) and
// automatically replace these at checkout. Tune the recommended rates here.

export const CINEFORCE_URL = "https://cineforce.vissionlink.com";

export type CrewDept = "Leadership" | "Camera Department" | "Lighting Department" | "Other";

export type CrewRateSource = "recommended" | "cineforce";

export type CrewPosition = {
  key: string;
  name: string;
  dept: CrewDept;
  /** ₱ per rental day — the RECOMMENDED flat rate, overridden by live Cineforce rates when available. */
  dailyRate: number;
  /** lead → eligible as the mandatory MAIN handler; support → as the ASSISTANT. */
  tier: "lead" | "support";
};

export const CREW_POSITIONS: CrewPosition[] = [
  // Leadership
  { key: "dop", name: "DOP (Director of Photography)", dept: "Leadership", dailyRate: 12000, tier: "lead" },
  // Camera Department
  { key: "camera-operator", name: "Camera Operator", dept: "Camera Department", dailyRate: 8000, tier: "lead" },
  { key: "first-ac", name: "1st AC (First Assistant Camera)", dept: "Camera Department", dailyRate: 5000, tier: "support" },
  { key: "second-ac", name: "2nd AC (Second Assistant Camera)", dept: "Camera Department", dailyRate: 4000, tier: "support" },
  { key: "cam-assist-clapper", name: "Cam Assist / Clapper Loader", dept: "Camera Department", dailyRate: 4000, tier: "support" },
  { key: "dit", name: "D.I.T. (Digital Imaging Technician)", dept: "Camera Department", dailyRate: 6000, tier: "lead" },
  { key: "camera-grip", name: "Camera Grip", dept: "Camera Department", dailyRate: 3500, tier: "support" },
  { key: "vtr-operator", name: "VTR Operator", dept: "Camera Department", dailyRate: 4000, tier: "lead" },
  { key: "vtr-assist-cableman", name: "VTR Assist / Cable Man", dept: "Camera Department", dailyRate: 3000, tier: "support" },
  { key: "steadicam-operator", name: "Steadicam Operator", dept: "Camera Department", dailyRate: 10000, tier: "lead" },
  { key: "prone-operator", name: "Prone Operator (specialized rig)", dept: "Camera Department", dailyRate: 6000, tier: "lead" },
  { key: "techno-crane-operator", name: "Techno Crane Operator", dept: "Camera Department", dailyRate: 8000, tier: "lead" },
  { key: "jib-operator", name: "Jib Operator", dept: "Camera Department", dailyRate: 6000, tier: "lead" },
  { key: "remote-head-technician", name: "Remote Head Technician", dept: "Camera Department", dailyRate: 6000, tier: "lead" },
  { key: "motion-control-operator", name: "Motion Control Operator", dept: "Camera Department", dailyRate: 8000, tier: "lead" },
  { key: "assist-tech", name: "Assist Tech (Assistant Technician)", dept: "Camera Department", dailyRate: 3000, tier: "support" },
  { key: "ronin-technician", name: "Ronin Technician (gimbal specialist)", dept: "Camera Department", dailyRate: 5000, tier: "lead" },
  // Lighting Department
  { key: "gaffer", name: "Gaffer", dept: "Lighting Department", dailyRate: 7000, tier: "lead" },
  { key: "best-boy-key-grip", name: "Best Boy Electric / Key Grip", dept: "Lighting Department", dailyRate: 5000, tier: "support" },
  { key: "lighting-technician", name: "Lighting Technician / Set Electric", dept: "Lighting Department", dailyRate: 3500, tier: "support" },
  { key: "generator-operator", name: "Generator Operator", dept: "Lighting Department", dailyRate: 3000, tier: "support" },
  { key: "dmx-technician", name: "DMX Technician", dept: "Lighting Department", dailyRate: 4000, tier: "support" },
  { key: "head-crew", name: "Head Crew", dept: "Lighting Department", dailyRate: 2500, tier: "lead" },
  { key: "lighting-crew", name: "Lighting Crew", dept: "Lighting Department", dailyRate: 2000, tier: "support" },
  // Other
  { key: "drone-operator", name: "Drone Operator", dept: "Other", dailyRate: 8000, tier: "lead" },
];

export const CREW_BY_KEY: Record<string, CrewPosition> = Object.fromEntries(CREW_POSITIONS.map((p) => [p.key, p]));
export const CREW_DEPARTMENTS: CrewDept[] = ["Leadership", "Camera Department", "Lighting Department", "Other"];

export const MAIN_HANDLER_POSITIONS = CREW_POSITIONS.filter((p) => p.tier === "lead");
export const ASSISTANT_POSITIONS = CREW_POSITIONS.filter((p) => p.tier === "support");

export type CrewMode = "crew" | "waiver";

export type CrewSelection = {
  mode: CrewMode;
  /** Mandatory equipment-handling crew (mode "crew"): 1 main + 1 assistant. */
  mainKey?: string;
  assistantKey?: string;
  /** Optional additional, project-related crew. */
  extras?: { key: string; qty: number }[];
  /** Waiver path (mode "waiver"): accepted + e-signed with the typed full name. */
  waiverAccepted?: boolean;
  waiverSignedName?: string;
};

export type ParsedCrew = { ok: true; value: CrewSelection } | { ok: false; error: string };

// Validates an untrusted crew payload (checkout body) into a safe selection.
export function parseCrewSelection(raw: unknown): ParsedCrew {
  const b = (raw ?? {}) as Record<string, unknown>;
  const mode = b.mode === "waiver" ? "waiver" : b.mode === "crew" ? "crew" : null;
  if (!mode) return { ok: false, error: "Choose whether to hire crew or sign the liability waiver." };

  if (mode === "waiver") {
    if (b.waiverAccepted !== true) return { ok: false, error: "Please read and accept the Equipment Rental Liability Waiver." };
    const signed = typeof b.waiverSignedName === "string" ? b.waiverSignedName.trim().slice(0, 200) : "";
    if (!signed) return { ok: false, error: "Type your full name to e-sign the liability waiver." };
    return { ok: true, value: { mode, waiverAccepted: true, waiverSignedName: signed } };
  }

  const mainKey = typeof b.mainKey === "string" ? b.mainKey : "";
  const assistantKey = typeof b.assistantKey === "string" ? b.assistantKey : "";
  if (!CREW_BY_KEY[mainKey] || CREW_BY_KEY[mainKey].tier !== "lead") {
    return { ok: false, error: "Select the main crew position that will handle the equipment." };
  }
  if (!CREW_BY_KEY[assistantKey] || CREW_BY_KEY[assistantKey].tier !== "support") {
    return { ok: false, error: "Select the assistant crew position that will handle the equipment." };
  }
  const extras: { key: string; qty: number }[] = [];
  if (Array.isArray(b.extras)) {
    for (const e of b.extras.slice(0, 20)) {
      const ex = (e ?? {}) as Record<string, unknown>;
      const key = typeof ex.key === "string" ? ex.key : "";
      if (!CREW_BY_KEY[key]) continue; // silently drop unknown/blank rows
      const qty = Math.min(20, Math.max(1, Math.floor(Number(ex.qty) || 1)));
      extras.push({ key, qty });
    }
  }
  return { ok: true, value: { mode, mainKey, assistantKey, extras } };
}

// Crew works the whole rental period — days derived from the booked date range
// (inclusive), falling back to 1 so totals never collapse to zero.
export function crewDaysFromRange(dateFrom: string, dateTo: string): number {
  const from = Date.parse(dateFrom);
  const to = Date.parse(dateTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 1;
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

export type CrewLine = { id: string; name: string; qty: number; days: number; ratePerDay: number };

// Expands a validated selection into order line items. The `crew-` id prefix is
// how the rest of the pipeline (finalize → contract labor schedule) recognises
// crew lines among the equipment items. `ratesByKey` lets callers price with
// live Cineforce rates (lib/crew-rates.ts); the recommended rate is the fallback.
export function crewLineItems(sel: CrewSelection, days: number, ratesByKey?: Record<string, number>): CrewLine[] {
  if (sel.mode !== "crew") return [];
  const d = Math.max(1, Math.floor(days) || 1);
  const rate = (p: CrewPosition) => ratesByKey?.[p.key] ?? p.dailyRate;
  const lines: CrewLine[] = [];
  const main = CREW_BY_KEY[sel.mainKey ?? ""];
  const assistant = CREW_BY_KEY[sel.assistantKey ?? ""];
  if (main) lines.push({ id: `crew-main-${main.key}`, name: `Crew — ${main.name} (equipment handler, main)`, qty: 1, days: d, ratePerDay: rate(main) });
  if (assistant) lines.push({ id: `crew-assist-${assistant.key}`, name: `Crew — ${assistant.name} (equipment handler, assistant)`, qty: 1, days: d, ratePerDay: rate(assistant) });
  for (const e of sel.extras ?? []) {
    const p = CREW_BY_KEY[e.key];
    if (p) lines.push({ id: `crew-extra-${p.key}`, name: `Crew — ${p.name} (additional crew)`, qty: e.qty, days: d, ratePerDay: rate(p) });
  }
  return lines;
}

export const isCrewItemId = (id: unknown) => typeof id === "string" && id.startsWith("crew-");

// ── Equipment Rental Liability Waiver ─────────────────────────────────────────
// Verbatim from BMR's "Equipment Rental Liability Waiver and Responsibility
// Agreement" (Waiver-2.pdf). Shown scroll-gated at checkout when no crew is
// hired, embedded in the e-contract terms, and rendered as its own PDF.
export const WAIVER_TITLE = "Equipment Rental Liability Waiver and Responsibility Agreement";

export const WAIVER_PREAMBLE =
  "This Equipment Rental Liability Waiver and Responsibility Agreement is entered into by and between BMR (“Lessor”) and the Renter named below. The Renter acknowledges receipt of the equipment and accessories listed in the Rental Agreement in good working condition and agrees to the following terms:";

export const WAIVER_CLAUSES: { title: string; body: string }[] = [
  {
    title: "1. Full Responsibility",
    body: "The Renter assumes full responsibility for all rented equipment and accessories from the time of pickup or delivery until the equipment is returned and inspected by the Lessor.",
  },
  {
    title: "2. Loss, Theft, or Damage",
    body: "The Renter shall be fully liable for any loss, theft, disappearance, destruction, or damage to the equipment and accessories, regardless of cause, including but not limited to negligence, accident, misuse, natural disasters, fire, flood, transportation incidents, or acts of third parties.",
  },
  {
    title: "3. Repair or Replacement Costs",
    body: "In the event of loss or damage, the Renter agrees to pay the full repair cost or replacement value of the equipment, as determined by the Lessor based on current market value, manufacturer pricing, or authorized service center quotations.",
  },
  {
    title: "4. Accessories Included",
    body: "The Renter's responsibility includes all accessories supplied with the equipment, including but not limited to batteries, chargers, cables, memory cards, monitors, wireless systems, tripods, cases, filters, lenses, tools, and any other items listed in the rental inventory.",
  },
  {
    title: "5. No Transfer of Responsibility",
    body: "The Renter remains responsible for the equipment even if it is used, handled, transported, or operated by employees, crew members, contractors, talents, drivers, or any third party associated with the production.",
  },
  {
    title: "7. Indemnification",
    body: "The Renter agrees to indemnify and hold harmless the Lessor from any claims, damages, liabilities, expenses, or legal actions arising from the use, possession, transportation, or operation of the rented equipment.",
  },
  {
    title: "8. Acceptance",
    body: "By signing below, the Renter confirms that they have read, understood, and agreed to all terms and conditions stated herein.",
  },
];

// Extra clause appended to the e-contract when the rental proceeds without crew.
export function waiverContractTerm(signedName: string, signedDate: string): string {
  return `24. NO-CREW LIABILITY WAIVER — The Hirer elected to rent WITHOUT ${"BMR"}-designated crew and executed the ${WAIVER_TITLE} (e-signed by ${signedName} on ${signedDate} at online checkout). The Hirer assumes full responsibility for the equipment and accessories from release until return and inspection, per the waiver attached to this agreement.`;
}
