// ── PayMongo Checkout integration ────────────────────────────────────────────
// Hosted Checkout Sessions for instant rentals: the customer is redirected to
// PayMongo to pay (card / GCash / Maya / GrabPay); a webhook then confirms the
// payment server-side. Server-only (Node runtime — uses crypto + Buffer).
//
// Env: PAYMONGO_SECRET_KEY (sk_live_… or sk_test_…), PAYMONGO_WEBHOOK_SECRET.
//      PAYMONGO_METHODS (optional) — comma list to pin payment methods, e.g.
//      "gcash,card". Unset = serve whatever's activated in the PayMongo dashboard.
import crypto from "crypto";

const BASE = "https://api.paymongo.com/v1";

export function hasPaymongo(): boolean {
  return Boolean(process.env.PAYMONGO_SECRET_KEY);
}

function authHeader(): string {
  // PayMongo uses HTTP Basic with the secret key as the username, blank password.
  return "Basic " + Buffer.from(`${process.env.PAYMONGO_SECRET_KEY ?? ""}:`).toString("base64");
}

export type CheckoutLine = { name: string; amount: number; quantity: number }; // amount in PHP (pesos)

export type CreateCheckoutInput = {
  lines: CheckoutLine[];
  description: string;
  referenceNumber: string;
  customer: { name: string; email: string; phone?: string };
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

// Create a hosted Checkout Session and return its id + redirect URL.
export async function createCheckoutSession(opts: CreateCheckoutInput): Promise<{ id: string; checkoutUrl: string }> {
  const line_items = opts.lines
    .filter((l) => l.amount > 0 && l.quantity > 0)
    .map((l) => ({ currency: "PHP", amount: Math.round(l.amount * 100), name: l.name.slice(0, 255), quantity: Math.max(1, Math.round(l.quantity)) }));

  // Payment methods: by default we DON'T pin a list — PayMongo then serves
  // exactly what's activated on the account, so newly-approved methods appear
  // at checkout with no redeploy. Set PAYMONGO_METHODS (comma-separated, e.g.
  // "gcash,card") to force a specific subset.
  const methodOverride = (process.env.PAYMONGO_METHODS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const body = {
    data: {
      attributes: {
        line_items,
        ...(methodOverride.length ? { payment_method_types: methodOverride } : {}),
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        description: opts.description.slice(0, 255),
        reference_number: opts.referenceNumber,
        send_email_receipt: true,
        billing: { name: opts.customer.name, email: opts.customer.email, ...(opts.customer.phone ? { phone: opts.customer.phone } : {}) },
        metadata: opts.metadata ?? {},
      },
    },
  };

  const res = await fetch(`${BASE}/checkout_sessions`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { data?: { id: string; attributes: { checkout_url: string } }; errors?: { detail?: string }[] } = {};
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || text.slice(0, 300) || "no body";
    throw new Error(`PayMongo HTTP ${res.status}: ${detail}`);
  }
  if (!json.data?.attributes?.checkout_url) throw new Error(`PayMongo returned no checkout_url: ${text.slice(0, 300)}`);
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

// Fetch a checkout session (used by the success page as a webhook fallback).
export async function getCheckoutSession(id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/checkout_sessions/${encodeURIComponent(id)}`, { headers: { Authorization: authHeader() } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return json.data ?? null;
}

// Issue a refund against a settled payment. `paymentId` is the pay_… id stored on
// the order; `amount` is in pesos (partial refunds allowed). Returns the refund id
// + status, or throws so the caller can fall back to a manual/offline refund.
export async function createRefund(opts: { paymentId: string; amount: number; reason?: string; notes?: string }): Promise<{ id: string; status: string }> {
  const body = {
    data: {
      attributes: {
        amount: Math.round(opts.amount * 100),
        payment_id: opts.paymentId,
        reason: opts.reason ?? "requested_by_customer", // PayMongo enum: duplicate|fraudulent|requested_by_customer|others
        ...(opts.notes ? { notes: opts.notes.slice(0, 255) } : {}),
      },
    },
  };
  const res = await fetch(`${BASE}/refunds`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { data?: { id: string; attributes?: { status?: string } }; errors?: { detail?: string }[] } = {};
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || text.slice(0, 300) || "no body";
    throw new Error(`PayMongo refund HTTP ${res.status}: ${detail}`);
  }
  return { id: json.data?.id ?? "", status: json.data?.attributes?.status ?? "pending" };
}

// True once at least one payment on the session has settled.
export function sessionIsPaid(session: Record<string, unknown> | null): boolean {
  const attrs = (session as { attributes?: Record<string, unknown> } | null)?.attributes;
  const payments = (attrs?.payments as { attributes?: { status?: string } }[] | undefined) ?? [];
  return payments.some((p) => p?.attributes?.status === "paid");
}

export type PaymentInfo = {
  method: string | null; // e.g. "gcash", "card", "paymaya", "grab_pay"
  reference: string | null; // the PayMongo payment id (pay_…)
  amount: number | null; // pesos actually collected
  paidAt: string | null; // ISO timestamp of settlement
};

// Pull the real channel/reference/amount from the settled payment on a session,
// so we record HOW the customer actually paid (not just "paymongo").
export function extractPaymentInfo(session: Record<string, unknown> | null): PaymentInfo {
  const attrs = (session as { attributes?: Record<string, unknown> } | null)?.attributes;
  type Pay = { id?: string; attributes?: { status?: string; amount?: number; paid_at?: number; payment_method_used?: string; source?: { type?: string } } };
  const payments = (attrs?.payments as Pay[] | undefined) ?? [];
  const paid = payments.find((p) => p?.attributes?.status === "paid") ?? payments[0];
  if (!paid) return { method: null, reference: null, amount: null, paidAt: null };
  const a = paid.attributes ?? {};
  return {
    method: a.source?.type ?? a.payment_method_used ?? null,
    reference: paid.id ?? null,
    amount: typeof a.amount === "number" ? Math.round(a.amount) / 100 : null,
    paidAt: typeof a.paid_at === "number" ? new Date(a.paid_at * 1000).toISOString() : null,
  };
}

// Verify the Paymongo-Signature header: HMAC-SHA256 over `${t}.${rawBody}` with
// the webhook secret. Header format: "t=<ts>,te=<testSig>,li=<liveSig>".
export function verifyWebhookSignature(rawBody: string, sigHeader: string | null): boolean {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";
  if (!secret || !sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(",")) {
    const i = seg.indexOf("=");
    if (i > 0) parts[seg.slice(0, i).trim()] = seg.slice(i + 1).trim();
  }
  const t = parts.t;
  const provided = parts.li || parts.te; // live signature preferred; test as fallback
  if (!t || !provided) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export type PaymongoEvent = { type: string; resourceId: string | null; resourceType: string | null };

// Pull the event type + the underlying resource id from a webhook payload.
export function parseWebhookEvent(body: unknown): PaymongoEvent {
  const attrs = (body as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes ?? {};
  const inner = (attrs.data as { id?: string; type?: string } | undefined) ?? {};
  return { type: String(attrs.type ?? ""), resourceId: inner.id ?? null, resourceType: inner.type ?? null };
}
