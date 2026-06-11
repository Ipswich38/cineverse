# PROJECT SNAPSHOT — VissionLink

> Generated 2026-06-11 (read-only audit, Step 1). Live at **vissionlink.com** (Vercel project `cineversestore`).

## Purpose & features as built

Film/production gear **rental marketplace** for the Philippine market, legally operated by BMR
Cinema Operation Services (sole prop, Non-VAT). Customer side: browse catalog of rentable camera
SETS (`/store`, `/gear/[slug]`, `/packages`), cart → checkout with PayMongo (15% downpayment model,
GCash/Maya/cards), scroll-gated T&C, order tracking + cancellation requests (`/order/[id]`), AI chat
assistant (Groq, catalog-grounded, FAQ fallback), contact/quote forms. Admin side (passcode-gated
`/admin`): quote→quotation→contract→invoice pipeline with generated PDFs, emailed documents, client
ledger (loyalty/delinquency), expenses/P&L, inventory units with auto-assignment + availability,
credit memos/refunds, Zoho inbox mirror, payment reminders (daily Vercel cron), admin AI co-pilot.

## Stack

- **Next.js 16.2.6** (App Router, `typedRoutes`), **React 19.2.4**, **TypeScript 5** — npm, lockfile present
- **Supabase** (`@supabase/supabase-js ^2.106`) — service-role client, server-only (`lib/supabase.ts`); no end-user auth
- **PayMongo** REST (`lib/paymongo.ts`) — live checkout sessions + HMAC-verified webhook (timing-safe)
- **pdfkit ^0.18** for quotation/contract/invoice/credit-memo PDFs (special webpack excludes in `next.config.ts`)
- **nodemailer / imapflow / mailparser** — Zoho SMTP out, IMAP inbox mirror in
- **Groq** (llama-3.3-70b) or Gemini for the chatbots, pluggable in `lib/chatbot/provider.ts`
- Styling: hand-rolled CSS (`app/globals.css`, 1,227 lines, CSS custom properties). **No Tailwind, no test framework.**

## Folder roles

| Path | Role |
|---|---|
| `app/` | Pages: home, store, gear, packages, cart, checkout(+success), order, contact, about, legal, providers, admin (single 3,210-line page) |
| `app/api/` | Route handlers: `admin/*` (Bearer-gated CRUD: quotes, quotations, contracts, invoices, clients, units, expenses, inbox, upload, reminders, assistant), `checkout/*` (session/status/webhook), `chat`, `catalog`, `packages`, `quote`, `quote-request`, `contact`, `order/[id]` |
| `components/` | UI: SiteChrome, ChatWidget, AdminAssistant, EquipmentCard, RentalCalendar, ProvisionalReceipt, etc. |
| `lib/` | Domain logic: pricing, cancellation, finalize-on-payment, PDFs, PayMongo, mail, clients ledger, unit assignment, chatbot |
| `supabase/` | SQL to run manually in the dashboard editor (no migration tool) |
| `docs/` | This snapshot (new) |
| `HANDOFF.md` | Session-handoff notes, partially stale (dated 2026-06-02) |

## Database (shared Supabase project `fhlkrenefobhshouuopc`, `public` schema, `vissionlink_` prefix)

- **`vissionlink_quote_requests`** — the workhorse: quote requests **and paid instant-rent orders** live on the same row. Columns added over time: `quotation/contract/invoice` (JSONB docs + status + pdf_path + sent_at), `channel`, fulfillment/cancel/refund fields. RLS **enabled, zero public policies** (service-role only).
- **`vissionlink_equipment`** — catalog (18 BMR camera sets live). RLS enabled + public-read-active policy.
- **`vissionlink_clients`** — ledger keyed by **email (PK)**: standing, clean_paid_count, totals.
- **`vissionlink_units`** — physical units: status, serial, last-known GPS, `assigned_request_id` → quote_requests.
- **`vissionlink_expenses`** — manual expense ledger for P&L.
- **`vissionlink_packages`** — referenced in code (`lib/supabase.ts`, `lib/packages-data.ts`) but **no CREATE TABLE in `supabase/`** — schema only exists in the live DB.
- `vissionlink.*` schema (profiles/apps/app_memberships, RLS'd) — SSO platform tables shared with sister apps; not used by this app's code.
- Storage buckets: `credit-memos` (PDFs), an upload bucket auto-created by `app/api/admin/upload/route.ts`.

## Integrations & where keys live

All keys via `process.env`, set in **Vercel project env** (the local `.env.local` has only 7 of ~19):
`PAYMONGO_SECRET_KEY` + `PAYMONGO_WEBHOOK_SECRET` (live), `ZOHO_SMTP_*` / `ZOHO_IMAP_*` + `CONTACT_TO` + `MAIL_BCC`,
`GROQ_API_KEY`/`GROQ_MODEL` (+ optional `GEMINI_*`), `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (+ anon key, unused in code),
`ADMIN_SECRET` (admin passcode = API Bearer token), `CRON_SECRET` (Vercel cron → reminders), `PAYMONGO_METHODS`.
**No `.env.example` exists.** Graceful degradation is designed in: no Supabase → seed catalog; no LLM key → keyword FAQ; chat always answers.

## Fragile / unusual

1. **Git topology**: local `main` (48 commits) is the real lineage. `origin/main` on github.com/Ipswich38/vissionlink is an **unrelated old lineage** (never force-push over it blindly); `origin/vissionlink` is the matching branch but is **33 commits behind** — a month of live production code exists only on this machine. No tags, version stuck at 0.1.0.
2. **Admin auth fallback**: `app/api/admin/_auth.ts` defaults to hardcoded `'vissionlink-admin'` if `ADMIN_SECRET` is unset — a publicly-guessable passcode guarding all admin CRUD. (`ADMIN_SECRET` *is* set in `.env.local`; Vercel value unverified.)
3. **Orders piggyback on `vissionlink_quote_requests`** — one wide table for two lifecycles; works, but every status machine (quotation/contract/invoice/fulfillment/cancel) shares a row.
4. `app/admin/page.tsx` is **3,210 lines** — the entire admin UI in one client component.
5. **Schema drift**: SQL files are run-once scripts, not migrations; `vissionlink_packages` and some columns exist only in the live DB. No DB backup routine beyond Supabase's own.
6. **No tests, no README, no error tracking** (failures visible only in Vercel logs); `HANDOFF.md` predates the PayMongo go-live and is partially stale.
7. Shared Supabase project with CineForce/Lakbay/BigAni — a bad migration here can touch sister apps' DB.
8. pdfkit requires the `serverExternalPackages` + file-tracing workaround in `next.config.ts`; removing it silently breaks all PDF generation in production (ENOENT at runtime, not build time).
