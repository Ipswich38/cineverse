# PROJECT SNAPSHOT — VissionLink

> Generated 2026-06-11 (audit Step 1); updated same day after stabilization (Step 5). Live at **vissionlink.com** (Vercel project `cineversestore`), version **v0.6.0**.

## Stabilization changes (2026-06-11, deployed)

- **Code is off the laptop**: local `main` pushed to `origin/vissionlink` (github.com/Ipswich38/vissionlink) + tag `v0.6.0`. `origin/main` remains an unrelated old lineage — never force-push it.
- **Admin auth fails closed**: hardcoded `'vissionlink-admin'` fallback removed (`app/api/admin/_auth.ts`); production verified — old default rejected (401), real `ADMIN_SECRET` works (200). Note: local `.env.local` ADMIN_SECRET differs from the Vercel (Sensitive-type) value.
- **RLS verified ON for all 6 live tables** (5 deny-all, equipment public-read-active) and captured in `supabase/rls-harden.sql`; live-only schema captured in `supabase/packages.sql` + `supabase/orders-columns.sql`.
- **Backups**: `npm run backup` dumps all six tables to gitignored `backups/<stamp>/` (first backup taken: 25 equipment, 5 orders, 181 units, 5 packages).
- **Error alerting**: `lib/report-error.ts` (console + deduped email via Zoho) wired into the paid-order finalize failure path in the PayMongo webhook. Client-ledger writes (`lib/clients-db.ts`) now log their errors.
- **Docs**: `.env.example` (all 19 vars), `docs/SMOKE_TEST.md` (10 steps), `docs/BACKLOG.md` (living backlog; `HANDOFF.md` marked superseded).

## Purpose & features as built

Film/production gear **rental marketplace** for the Philippine market, legally operated by BMR
Cinema Operation Services (sole prop, Non-VAT). Customer side: browse catalog of rentable camera
SETS (`/store`, `/gear/[slug]`, `/packages`), cart → checkout with PayMongo (15% downpayment model,
GCash/Maya/cards), scroll-gated T&C, order tracking + cancellation requests (`/order/[id]`), passwordless
order history via emailed magic link (`/my-orders`, HMAC-signed, 7-day TTL — no customer accounts
by design), AI chat assistant (Groq, catalog-grounded, FAQ fallback), contact/quote forms. Admin side (passcode-gated
`/admin`): quote→quotation→contract→invoice pipeline with generated PDFs, emailed documents, client
ledger (loyalty/delinquency), expenses/P&L, inventory units with auto-assignment + availability,
credit memos/refunds, Zoho inbox mirror, payment + equipment-return reminders (daily Vercel cron:
balance at T-3/due/T+1/T+7 on invoice due date; return at T-1/due/T+1 on `date_to`, owners BCC'd), admin AI co-pilot.
**Equipment tracking (v0.7.0):** delivery lifecycle `paid → shipped → arrived → left_premises → returned → settled`
(each stamped); MapLibre fleet map + active-deliveries board in admin Equipment Monitoring
(`components/AdminFleetMap.tsx`, OSM tiles, 30s refresh); per-order signed courier links (`/track`, 14-day,
GPS check-in + arrived/left-premises only) minted from the admin board; `POST /api/track` also accepts a
`TRACK_DEVICE_TOKEN` bearer for future SIM GPS trackers — hardware plugs in with zero code changes.

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
All documented in **`.env.example`**. Graceful degradation is designed in: no Supabase → seed catalog; no LLM key → keyword FAQ; chat always answers.

## Fragile / unusual (post-stabilization)

1. **Git topology**: `origin/main` is an **unrelated old lineage** — the real branch is `origin/vissionlink`; never force-push `main`. Consider switching the GitHub default branch to `vissionlink`.
2. **Orders piggyback on `vissionlink_quote_requests`** — one wide table for two lifecycles; works, but every status machine (quotation/contract/invoice/fulfillment/cancel) shares a row.
3. `app/admin/page.tsx` is **3,210 lines** — split deferred to BACKLOG (do it tab-by-tab with the smoke test as the regression net).
4. SQL files are run-once scripts, not migrations — rebuild order: vissionlink → quote-requests → quotations → quote-channel → contract-invoice → clients → admin-apps → packages → orders-columns → rls-harden.
5. Shared Supabase project with CineForce/Lakbay/BigAni — a bad migration here can touch sister apps' DB. Run `npm run backup` before any schema change.
6. pdfkit requires the `serverExternalPackages` + file-tracing workaround in `next.config.ts`; removing it silently breaks all PDF generation in production (ENOENT at runtime, not build time).
7. Backups are manual (`npm run backup`) and live only on this machine — no offsite copy yet.
8. Color palette still untokenized (hundreds of inline hex values in TSX) — cosmetic, tracked in BACKLOG.
