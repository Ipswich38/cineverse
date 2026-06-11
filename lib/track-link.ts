// Signed courier tracking tokens — same HMAC scheme as lib/order-link.ts but
// scoped to one ORDER instead of an email, so a courier link can only check in
// location/status for its own delivery. Payload shape {o,x} is disjoint from
// the orders-token {e,x}, so tokens cannot be replayed across the two systems.
import crypto from "node:crypto";

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // covers shipping + the rental + return trip

function secret(): string {
  return process.env.ORDER_LINK_SECRET ?? "";
}

export function hasTrackLinks(): boolean {
  return Boolean(secret());
}

export function makeTrackToken(orderId: string): string {
  const payload = Buffer.from(JSON.stringify({ o: orderId, x: Date.now() + TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// Returns the verified order id, or null for anything invalid/expired.
export function verifyTrackToken(token: string): string | null {
  if (!secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest();
  let provided: Buffer;
  try { provided = Buffer.from(sig, "base64url"); } catch { return null; }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;
  try {
    const { o, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof o !== "string" || typeof x !== "number" || Date.now() > x) return null;
    return o;
  } catch {
    return null;
  }
}
