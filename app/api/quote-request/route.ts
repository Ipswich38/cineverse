import { NextResponse } from "next/server";
import { sendQuoteRequestEmail } from "@/lib/contact-mail";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { PACKAGE_OFFERS } from "@/lib/package-offers";
import { providerBySlug } from "@/lib/providers";
import { generateDraft } from "@/lib/quotation";

export const runtime = "nodejs";

const TABLE = "vissionlink_quote_requests";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Quotation tab of the /contact form. A request must name a provider and a
// package. We email hello@vissionlink.com (primary) and also log it to the
// Supabase admin inbox (best-effort) so it shows up under /admin.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

  // Honeypot — humans never fill this hidden field; bots do. Silently accept.
  if (str(body.website, 100)) return NextResponse.json({ ok: true });

  const name = str(body.name, 200);
  const email = str(body.email, 200);
  const providerSlug = str(body.provider, 80);
  const packageSlug = str(body.package, 120);

  if (!name || !email || !providerSlug || !packageSlug) {
    return NextResponse.json(
      { ok: false, error: "Pick a provider and a package, and add your name and email." },
      { status: 400 },
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const provider = providerBySlug(providerSlug);
  const offer = PACKAGE_OFFERS.find((o) => o.slug === packageSlug);
  if (!provider || !offer) {
    return NextResponse.json({ ok: false, error: "Unknown provider or package." }, { status: 400 });
  }

  const phone = str(body.phone, 60);
  const company = str(body.company, 200);
  const project = str(body.project, 300);
  const dateFrom = str(body.dateFrom, 40);
  const dateTo = str(body.dateTo, 40);
  const notes = str(body.notes, 4000);

  // Primary: email hello@vissionlink.com
  const mail = await sendQuoteRequestEmail({
    name,
    email,
    phone,
    company,
    project,
    dateFrom,
    dateTo,
    notes,
    providerName: provider.name,
    packageName: offer.name,
    priceRange: offer.priceRange,
  });

  // Secondary (best-effort): log to the admin inbox so /admin tracks it too, and
  // auto-generate the editable e-quotation draft from the BMR rate card so the
  // provider has a complete quotation waiting for review. It is NEVER auto-sent —
  // the provider reviews/edits in /admin and clicks Send themselves.
  if (hasSupabase()) {
    try {
      const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const items = [
        {
          type: "package",
          slug: offer.slug,
          name: offer.name,
          providerSlug: provider.slug,
          providerName: provider.name,
          priceRange: offer.priceRange,
        },
      ];
      const draft = generateDraft({
        id,
        name,
        company,
        email,
        phone,
        project,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        notes,
        items,
      });
      await supabaseAdmin()!
        .from(TABLE)
        .insert({
          id,
          name,
          company,
          email,
          phone,
          project,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          notes,
          items,
          est_total: 0,
          status: "pending",
          quotation: draft,
          quotation_status: "draft",
        });
    } catch (err) {
      console.error("[quote-request:db]", err);
    }
  }

  if (!mail.ok) {
    return NextResponse.json(
      { ok: false, error: "Could not send right now. Please email hello@vissionlink.com directly." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
