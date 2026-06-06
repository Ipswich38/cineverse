import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, parseWebhookEvent } from "@/lib/paymongo";
import { finalizeRentalOrder } from "@/lib/rental-finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PayMongo webhook. Reads the RAW body for signature verification, then on a paid
// checkout session finalizes the rental (idempotent). Returns 200 on success so
// PayMongo stops retrying; 500 on a transient failure so it retries.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("paymongo-signature");
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload." }, { status: 400 }); }

  const event = parseWebhookEvent(body);
  if (event.type !== "checkout_session.payment.paid") {
    return NextResponse.json({ ok: true, ignored: event.type }); // not a paid event — ack and move on
  }

  // The order id rides along in the session metadata / reference number.
  const attrs = (body as { data?: { attributes?: { data?: { attributes?: Record<string, unknown> } } } })?.data?.attributes?.data?.attributes ?? {};
  const meta = (attrs.metadata as { orderId?: string } | undefined) ?? {};
  const orderId = meta.orderId || (attrs.reference_number as string | undefined);
  if (!orderId) return NextResponse.json({ ok: true, ignored: "no order id" });

  const result = await finalizeRentalOrder(orderId);
  if (!result.ok && !result.alreadyDone) {
    return NextResponse.json({ error: result.error || "Finalize failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
