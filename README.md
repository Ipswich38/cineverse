# CineVerse Rentals

A peer-to-peer **production gear rental marketplace** for the Philippine film/entertainment
industry — built with Next.js 16, Supabase, Vercel, and PayMongo Hosted Checkout.

CineVerse holds no inventory. Equipment belongs to independent **owners**. Renters browse gear,
pick a rental duration, optionally hire an **operator**, and reserve with a **30% downpayment**.
On payment, the owner is notified with the renter's contact details to coordinate handover and
settle the balance.

## Stack

- Next.js App Router
- Supabase Postgres for listings, bookings, and booking items
- PayMongo Checkout Sessions for the downpayment (GCash, Maya, GrabPay, card)
- Notification adapters (email + SMS) — provider-agnostic, env-gated
- Zustand cart persisted in the browser
- Tailwind CSS and shadcn-style UI components

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.local.example .env.local
```

3. Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
# Notifications (provider TBD — leave placeholders to no-op safely)
EMAIL_PROVIDER_API_KEY=your-email-api-key
SMS_PROVIDER_API_KEY=your-sms-api-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Run the database SQL in your Supabase SQL editor:
   - **Fresh project:** run `supabase/schema.sql` (rental marketplace + demo film gear).
   - **Existing product-store DB:** run `supabase/add-rental-marketplace.sql` to add the new
     columns without dropping data.
   - Inventory admin tables: `supabase/add-inventory-management.sql`.

5. Start the app:

```bash
npm run dev
```

## PayMongo Setup

See **`docs/PAYMONGO_SETUP.md`** for the full guide (keys, enabling GCash/Maya/GrabPay/card,
registering the webhook, testing).

Webhook URL: `https://YOUR-DOMAIN/api/webhook/paymongo`. The checkout route creates a pending
booking, then redirects the renter to pay the **30% downpayment**. The webhook marks the booking
paid and fires the renter confirmation + owner handoff.

## Notifications

`lib/notifications.ts` provides `sendEmail` and `sendSms` adapters. With no provider keys they
safely no-op (and log), so the whole flow works in development. To go live, fill the env vars and
implement the marked fetch calls — suggested: **Resend** (email) and **Semaphore** (PH SMS).

On a paid downpayment the webhook sends:
- **Renter:** booking confirmation (email + SMS) with downpayment, balance, and shoot date.
- **Each owner:** their booked gear + the renter's contact info to coordinate handover.

## Rental Flow

- Listings are priced per day; each carries its owner's contact + an optional operator day-rate.
- Listing pages let the renter set **duration (days)**, **units**, and toggle a **trained operator**,
  with a live price + 30% downpayment preview.
- Smart recommendations suggest complementary gear for the shoot (camera → lens/light/grip/audio).
- Checkout captures contact, shoot date, and notes, then charges the **30% downpayment** via PayMongo.
- The order-success page renders a **downpayment invoice** (gear, operators, total, balance due).
- Pricing is always recomputed server-side in `/api/checkout` — client amounts are never trusted.

## Admin Prototype

Open `/admin` to view the operations console (listings + bookings). It manages the same Supabase
tables (`products` = listings, `orders` = bookings). Before production, replace the demo password
gate with Supabase Auth and restrict admin actions with server-side authorization.

## Production Checklist

- Run the Supabase schema (or migration) in the production project.
- Add all environment variables in Vercel.
- Set `NEXT_PUBLIC_BASE_URL` to your domain with no trailing slash.
- Use PayMongo live keys only after sandbox checkout and webhook tests pass.
- Register the production webhook URL in PayMongo live mode.
- Choose + wire the email/SMS providers (or keep the no-op stubs intentionally).
- Replace demo listings, owner contacts, branding, and images with the client's real data.

## Verification

```bash
npm run lint
npm run build
```

## Notes

Bookings and booking items are server-only in Supabase RLS. The browser can read active listings,
but it must not create bookings, change status, or write booking items with the public anon key.
Owner contact details are stored on listings/booking items but only surfaced to the renter (via
the post-payment notification) after the downpayment clears.
