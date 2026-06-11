// Minimal production error tracking: console.error (lands in Vercel function
// logs) + a best-effort email alert to the owner via the existing Zoho mailbox.
// Used on money-critical failure paths where silence would mean a paid order
// quietly not being fulfilled. Never throws; never blocks the caller's response.
import { sendAlertEmail } from "./contact-mail";

const lastSent = new Map<string, number>();
const DEDUPE_MS = 15 * 60 * 1000; // one email per context+key per 15 min

export function reportError(context: string, detail: string, dedupeKey = ""): void {
  console.error(`[${context}] ${detail}`);
  const key = `${context}:${dedupeKey}`;
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < DEDUPE_MS) return;
  lastSent.set(key, now);
  void sendAlertEmail(
    `[vissionlink alert] ${context}`,
    `${detail}\n\nTime: ${new Date().toISOString()}\nThis is an automated production alert from vissionlink.com.`,
  ).catch(() => {});
}
