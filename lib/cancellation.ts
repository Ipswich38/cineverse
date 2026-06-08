// ── Cancellation / refund request — shared policy + validation ────────────────
// Used by both the client request form and the server validators so the gate is
// identical on both sides. Refunds are never self-service: a request is reviewed
// by the team against the rental terms the client accepted at checkout.

// Allowed reason categories. "Other" still requires a substantive explanation.
export const REASON_CATEGORIES = [
  "Schedule conflict / date change",
  "Project cancelled or postponed",
  "Booked the wrong item or quantity",
  "Equipment availability issue",
  "Budget change",
  "Other (please explain)",
] as const;

export type ReasonCategory = (typeof REASON_CATEGORIES)[number];

// A reason must be substantive — shallow one-liners ("changed my mind") don't
// qualify. Enforced on the client (live) and re-checked on the server.
export const MIN_REASON_LEN = 40;

export function isValidCategory(v: unknown): v is ReasonCategory {
  return typeof v === "string" && (REASON_CATEGORIES as readonly string[]).includes(v);
}

// Returns an error string if the request is not acceptable, else null.
export function validateRequest(category: unknown, reason: unknown): string | null {
  if (!isValidCategory(category)) return "Please choose a reason category.";
  const text = typeof reason === "string" ? reason.trim() : "";
  if (text.length < MIN_REASON_LEN) {
    return `Please describe your reason in a bit more detail (at least ${MIN_REASON_LEN} characters) so the team can review it fairly.`;
  }
  return null;
}

// Cancellation lifecycle on an order row.
export type CancelStatus = "requested" | "approved" | "declined" | "refunded" | "cancelled";
