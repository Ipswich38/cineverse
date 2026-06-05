// Client loyalty + delinquency policy. Pure logic over a client ledger row.
// The tier is earned from clean, on-time, good-return rentals; standing is the
// risk overlay. Together they set the loyalty discount, the deposit size, and
// whether post-dated cheques (PDC) are accepted.

export type ClientStanding = "good" | "watch" | "blocked";

export type ClientRecord = {
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  standing: ClientStanding;
  clean_paid_count: number;
  total_spent: number;
  bounced_count: number;
  late_count: number;
  notes?: string | null;
};

export type LoyaltyTier = "new" | "bronze" | "silver" | "gold";

// Tier thresholds by clean (on-time + good return) rentals, with the loyalty
// discount and the *baseline* deposit each tier earns (in good standing).
export const TIERS: { tier: LoyaltyTier; label: string; minClean: number; loyaltyRate: number; depositRate: number }[] = [
  { tier: "new", label: "New client", minClean: 0, loyaltyRate: 0.0, depositRate: 0.5 },
  { tier: "bronze", label: "Bronze", minClean: 1, loyaltyRate: 0.03, depositRate: 0.4 },
  { tier: "silver", label: "Silver", minClean: 3, loyaltyRate: 0.05, depositRate: 0.3 },
  { tier: "gold", label: "Gold", minClean: 6, loyaltyRate: 0.08, depositRate: 0.2 },
];

export function tierFor(cleanPaidCount: number): (typeof TIERS)[number] {
  const n = Math.max(0, Number(cleanPaidCount) || 0);
  let chosen = TIERS[0];
  for (const t of TIERS) if (n >= t.minClean) chosen = t;
  return chosen;
}

export type ClientPolicy = {
  tier: LoyaltyTier;
  tierLabel: string;
  standing: ClientStanding;
  loyaltyRate: number; // applied as a discount on the rental
  depositRate: number; // share of the rental total required before/at delivery
  pdcAllowed: boolean; // post-dated cheque accepted as a payment channel
  blocked: boolean; // no rental should be released
  reason: string; // short human explanation for the admin
};

// Resolve the effective policy for a client. Standing overrides the tier:
//  • watch   → loyalty frozen, deposit raised, PDC withdrawn (recent late/bounce)
//  • blocked → no release at all
// A first-timer (no record) is treated as a New client in good standing.
export function policyFor(client: ClientRecord | null): ClientPolicy {
  const t = tierFor(client?.clean_paid_count ?? 0);
  const standing: ClientStanding = client?.standing ?? "good";

  if (standing === "blocked") {
    return { tier: t.tier, tierLabel: t.label, standing, loyaltyRate: 0, depositRate: 1, pdcAllowed: false, blocked: true, reason: "Client is blocked — settle outstanding balances before any new release." };
  }
  if (standing === "watch") {
    return { tier: t.tier, tierLabel: t.label, standing, loyaltyRate: 0, depositRate: Math.min(1, t.depositRate + 0.2), pdcAllowed: false, blocked: false, reason: "On watch — loyalty paused, higher deposit, cleared funds only (no PDC) until standing recovers." };
  }
  return {
    tier: t.tier,
    tierLabel: t.label,
    standing,
    loyaltyRate: t.loyaltyRate,
    depositRate: t.depositRate,
    pdcAllowed: t.tier !== "new", // PDC earned after the first clean rental
    blocked: false,
    reason: t.tier === "new" ? "New client — standard 50% deposit, no PDC until the first clean rental." : `${t.label} client in good standing.`,
  };
}

// After a rental is fully paid on time and returned in good condition, advance
// the ledger. Late/bounced events are recorded separately (see markDelinquency).
export function applyCleanRental(client: ClientRecord, amountPaid: number): Partial<ClientRecord> {
  return {
    clean_paid_count: (client.clean_paid_count ?? 0) + 1,
    total_spent: (Number(client.total_spent) || 0) + (Number(amountPaid) || 0),
    // A clean rental nudges a 'watch' client back toward 'good'.
    standing: client.standing === "watch" ? "good" : client.standing,
  };
}

// Record a delinquency (late settlement or bounced PDC). Demotes to 'watch' and
// resets earned loyalty progress so the tier has to be re-earned.
export function markDelinquency(client: ClientRecord, kind: "late" | "bounced"): Partial<ClientRecord> {
  return {
    standing: client.standing === "blocked" ? "blocked" : "watch",
    late_count: (client.late_count ?? 0) + (kind === "late" ? 1 : 0),
    bounced_count: (client.bounced_count ?? 0) + (kind === "bounced" ? 1 : 0),
    clean_paid_count: 0, // streak broken — re-earn the tier
  };
}
