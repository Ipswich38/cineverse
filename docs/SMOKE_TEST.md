# VissionLink Smoke Test — run after every production deploy

~10 minutes, in order. Any ❌ on steps 1–7 = roll back the deploy
(`vercel rollback` or redeploy the previous build from the Vercel dashboard).
Use PayMongo TEST keys when exercising step 5 fully; on live keys, stop at the
PayMongo redirect unless you intend a real ₱ charge.

1. **Home loads** — https://vissionlink.com renders hero, carousel, featured
   sets. No blank sections, no console errors.
2. **Catalog is live (not seed)** — /store lists the 18 BMR camera sets with
   real photos and prices. If you see generic demo gear, Supabase env is broken.
3. **Gear detail + calendar** — open any set → /gear/[slug] shows rate, deposit,
   specs; the rental calendar opens and blocks unavailable dates.
4. **Cart math** — add a set for 3 days → cart shows rate×days, 15% downpayment
   and refundable security deposit computed correctly.
5. **Checkout** — fill checkout; T&C box must require scrolling before the agree
   checkbox enables; "Pay" redirects to a PayMongo checkout page (gcash/maya/
   cards visible). *(Test keys only: pay → success page shows order number.)*
6. **Order emails** *(test payment only)* — customer receives confirmation +
   contract + invoice-proof from hello@vissionlink.com; owners get the BCC copy.
7. **Order status page** — /order/[id] from the success page/email loads and
   shows the paid state; "Request cancellation" form opens.
8. **Chat assistant** — open the yellow chat button, ask "how much is the
   komodo set?" → grounded answer with a real price (source: ai). With no/dead
   GROQ key it must still answer via FAQ, never error.
9. **Admin gate + data** — /admin rejects a wrong code; correct ADMIN_SECRET
   shows quotes/orders, inventory Availability (181 units), clients, P&L.
10. **Admin documents** — open a quote → generate/preview a quotation PDF
    (exercises the fragile pdfkit packaging); admin Inbox tab shows recent
    Zoho mail.

Last verified: 2026-06-11 (steps 1–4, 8, 9 after audit deploy).
