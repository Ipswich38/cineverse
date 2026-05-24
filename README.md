# Store Template

Client-ready ecommerce storefront built with Next.js 16, Supabase, Vercel, and PayMongo Hosted Checkout.

## Stack

- Next.js App Router
- Supabase Postgres for products, orders, and order items
- PayMongo Checkout Sessions for hosted payments
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
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

4. Run `supabase/schema.sql` in your Supabase SQL editor.

5. Start the app:

```bash
npm run dev
```

## PayMongo Setup

Create a webhook in the PayMongo dashboard:

```text
https://your-domain.com/api/webhook/paymongo
```

For local webhook testing, expose your local server with a tunnel and use the tunnel URL. The webhook secret from PayMongo must be saved as `PAYMONGO_WEBHOOK_SECRET`.

The checkout route creates pending orders before redirecting customers to PayMongo. The webhook marks orders as paid after PayMongo confirms the checkout payment.

## Commerce Flow

- Product catalog supports sale pricing, badges, categories, and tags for merchandising.
- Product pages show related recommendations based on category, shared tags, add-on price, and bundle fit.
- Cart and checkout include smart add-ons to increase basket size and help customers reach free shipping.
- Checkout captures contact details, shipping address, delivery method, billing address, and payment preference before PayMongo redirect.
- Paid PayMongo webhooks move orders from `pending` to `paid`, set fulfillment to `to_pack`, and call `decrement_inventory_for_order`.
- Fulfillment statuses are modeled as `awaiting_payment`, `to_pack`, `packing`, `ready_to_ship`, `picked_up`, `shipped`, `delivered`, and `returned`.
- Inventory deduction is idempotent through `inventory_deducted_at`, so duplicate payment webhooks do not subtract stock twice.

## Admin Prototype

Open `/admin` to view the operations console.

```text
Demo password: demo-admin
```

The prototype admin shows order movement, inventory levels, low-stock signals, and fulfillment status controls. It uses demo data until Supabase credentials are configured. Before production launch, replace the demo password gate with Supabase Auth and restrict admin actions with server-side authorization.

## Production Checklist

- Run the Supabase schema in the production Supabase project.
- Add all environment variables in Vercel.
- Set `NEXT_PUBLIC_BASE_URL` to the production domain with no trailing slash.
- Use PayMongo live keys only after sandbox checkout and webhook tests pass.
- Register the production webhook URL in PayMongo live mode.
- Replace demo products, branding, contact details, policy links, and product images.
- Confirm stock counts and fulfillment process with the client before launch.

## Verification

```bash
npm run lint
npm run build
```

## Notes

Orders and order items are intentionally server-only in Supabase RLS. The browser can read active products, but it should not be allowed to create orders, change order status, or write order items directly with the public anon key.
