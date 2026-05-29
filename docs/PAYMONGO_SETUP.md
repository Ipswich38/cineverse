# PayMongo Setup Guide

The store's PayMongo integration is **fully wired**. It accepts **GCash, Maya, GrabPay, and card**.
Until real keys are added, checkout is safely disabled (returns a clear "needs a real PayMongo
secret key" message). Follow these steps once your PayMongo account is approved.

## 1. Get your API keys

PayMongo Dashboard → **Developers → API Keys**

You get two pairs of keys:

| Mode | Secret key prefix | Use for |
|------|-------------------|---------|
| Test | `sk_test_...`     | Local + staging testing |
| Live | `sk_live_...`     | Real customer payments  |

Start with **test** keys. Only switch to live after a successful test payment.

## 2. Enable e-wallet payment methods

PayMongo Dashboard → **Settings → Payment Methods** (or **Developers → Payment Methods**).
Toggle ON:

- **GCash**
- **Maya** (shows as PayMaya)
- **GrabPay**
- **Card** (Visa / Mastercard)

> Some methods require business verification before they go live. GCash/Maya/Card are usually
> available in test mode immediately. If a method is OFF in your account, PayMongo will reject a
> checkout that requests it — so only request methods you've enabled.

## 3. Paste keys into the project

Edit `.env.local` (placeholders are already there):

```
PAYMONGO_SECRET_KEY="sk_test_xxxxxxxxxxxx"      # ← your test secret key
PAYMONGO_WEBHOOK_SECRET="whsec_xxxxxxxxxxxx"    # ← from step 4
```

## 4. Register the webhook

PayMongo Dashboard → **Developers → Webhooks → Create webhook**

- **URL:** `https://YOUR-DOMAIN/api/webhook/paymongo`
  (for the deployed Vercel site, e.g. `https://store.waevpoint.quest/api/webhook/paymongo`)
- **Events:** at minimum `checkout_session.payment.paid`
- After creating, copy the **webhook signing secret** (`whsec_...`) → paste into
  `PAYMONGO_WEBHOOK_SECRET`.

The webhook is what flips an order from `pending` → `paid`, sets fulfillment to `to_pack`, and
deducts inventory (idempotently — duplicate webhooks won't double-subtract stock).

### Local webhook testing
PayMongo can't reach `localhost`. Expose your dev server with a tunnel:

```bash
npx localtunnel --port 3000        # or: cloudflared tunnel --url http://localhost:3000
```

Use the tunnel URL for the webhook during testing.

## 5. Test a payment

1. `pnpm dev` (or `npm run dev`)
2. Add a product to cart → Checkout → fill details → choose a method → Pay.
3. On the PayMongo test page use the sandbox flows:
   - **GCash / Maya / GrabPay (test):** click **Authorize Test Payment** / **Success**.
   - **Card (test):** `4343 4343 4343 4345`, any future expiry, any CVC.
4. You should land on `/order-success`, and the order in `/admin` should show **paid**.

## 6. Go live

1. Confirm test checkout + webhook both work end-to-end.
2. Swap `.env.local` (and Vercel env vars) to the **live** keys:
   `sk_live_...` and the **live-mode** webhook's `whsec_...`.
3. Register the webhook again in PayMongo **Live mode** (test and live webhooks are separate).
4. Redeploy.

## How buyer payment choice maps (reference)

The checkout page lets the buyer pre-select a method; this controls what PayMongo shows:

| Buyer choice | PayMongo `payment_method_types` |
|--------------|---------------------------------|
| All methods (recommended) | `card, gcash, paymaya, grab_pay` |
| GCash    | `gcash` |
| Maya     | `paymaya` |
| GrabPay  | `grab_pay` |
| Card     | `card` |

This mapping lives in `lib/paymongo.ts` (`PAYMENT_METHOD_MAP`). To add more methods later
(e.g. `qrph`, `billease`, online banking), add them there and enable them in your PayMongo account.

## Fees (for client pricing)

PayMongo charges roughly: **GCash/Maya ~2.5%**, **GrabPay ~2.2%**, **Card ~3.5% + ₱15**.
Much cheaper than Lazada/Shopee commissions (8–12%). Confirm current rates in your PayMongo
dashboard before quoting the client.
