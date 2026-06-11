// Signed magic-link tokens for the passwordless "My orders" page. The token
// carries only the customer's email + an expiry, HMAC-signed with
// ORDER_LINK_SECRET. No DB state, no passwords — possession of the link
// (delivered to the customer's own inbox) is the authentication.
import crypto from "node:crypto";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // links live 7 days; page data is read-only

function secret(): string {
  return process.env.ORDER_LINK_SECRET ?? "";
}

export function hasOrderLinks(): boolean {
  return Boolean(secret());
}

export function makeOrdersToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), x: Date.now() + TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// Returns the verified email, or null for anything invalid/expired/unsigned.
export function verifyOrdersToken(token: string): string | null {
  if (!secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest();
  let provided: Buffer;
  try { provided = Buffer.from(sig, "base64url"); } catch { return null; }
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof e !== "string" || typeof x !== "number" || Date.now() > x) return null;
    return e;
  } catch {
    return null;
  }
}
