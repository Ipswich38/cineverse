# Ecosystem Handoff — paste this at the start of a new session

> **SUPERSEDED 2026-06-11** — kept for history only. Current state lives in
> `docs/PROJECT_SNAPSHOT.md`; open work lives in `docs/BACKLOG.md`.

> Snapshot date: 2026-06-02. Your persistent memory has the deep detail; this is the fast path.

## VissionLink Current Session Handoff

- Repo: `/Users/zer0fx28/vissionlink`
- Live site: `https://vissionlink.com`
- Latest deployed production build: `cineversestore-ev97negwt-cherwin-fernandezs-projects.vercel.app`
- Build status: `npm run build` passes
- Deployment status: production alias is current and healthy

Current work in the landing page:
- Hero section is full-bleed.
- Carousel is manual now, with invisible scrollbar and large subtle left/right edge arrows.
- Carousel items use real catalog photos with fallbacks for missing/bad images.
- Featured provider section was added after the carousel, highlighting `BMR Cinema Operation Services` and linked package offers.
- Featured inventory remains below that section.
- Hero copy spacing was loosened to reduce crowding.

Navigation/header state:
- Main header background is warm off-white (`#fffaf0`).
- Main nav remains line-separated, not boxed.
- Active tab underline is golden yellow.
- Category nav is black/white with golden hover accents.

Important files touched recently:
- [app/page.tsx](/Users/zer0fx28/vissionlink/app/page.tsx)
- [app/globals.css](/Users/zer0fx28/vissionlink/app/globals.css)
- [components/SiteChrome.tsx](/Users/zer0fx28/vissionlink/components/SiteChrome.tsx)
- [components/CategoryNav.tsx](/Users/zer0fx28/vissionlink/components/CategoryNav.tsx)
- [lib/package-offers.ts](/Users/zer0fx28/vissionlink/lib/package-offers.ts)
- [HANDOFF.md](/Users/zer0fx28/vissionlink/HANDOFF.md)

Open worktree note:
- The repo is still dirty by design. I did not create a commit.

```
Continue my multi-app ecosystem. Read your persistent memory first
(MEMORY.md + project_store_template.md, project_cineverse_setready.md,
project_lakbay.md, project_farm_to_market.md) before acting.

PARENT BRAND: VissionLink (vissionlink.com). Legally operated by BMR Cinema
Operation Services (sole prop, Non-VAT, TIN 282-087-636-00001). Website docs are
PROVISIONAL receipts only — official receipt = BMR's BIR booklet.

APPS, LOCATIONS, DEPLOY:
1. VissionLink — gear rental — /Users/zer0fx28/vissionlink — Vercel project
   "cineversestore" — deploy: `vercel --prod --yes`. Git: committed locally
   (cce0b71), NOT pushed (origin points at shared cineverse repo — confirm
   correct repo before pushing).
2. CineForce — crew marketplace — cineforce.vissionlink.com —
   /Users/zer0fx28/kreativloops/setready — pnpm. DEPLOY ONLY via
   `pnpm release patch|minor|major` (NEVER vercel --prod); requires a
   CHANGELOG.md [Unreleased] entry first; commit+tag+push after. Already live +
   pushed (remote: github.com/Ipswich38/cineforce.git).
3. BigAni — agri marketplace — bigani.vissionlink.com —
   /Users/zer0fx28/kreativloops/ani — Vercel project "ani" — deploy:
   `vercel --prod --yes`. Git: committed locally (c6c0be3), NOT pushed.
4. Lakbay — ride-hailing (PAUSED) — not cached by design (live data).

SHARED SUPABASE PROJECT: fhlkrenefobhshouuopc. VissionLink → public.vissionlink_equipment;
CineForce → public.* (profiles etc.); BigAni → `agri` schema.

CACHING PATTERN (already applied to all 3): unstable_cache + tag + /api feed,
with graceful seed fallback. Next 16 gotcha: revalidateTag(tag,'max') wrapped in
try/catch + a short `revalidate` window as backup.

PENDING — DB activation (run in Supabase SQL editor, project fhlkrenefobhshouuopc):
- VissionLink: run vissionlink/supabase/vissionlink.sql
- BigAni: run ani/supabase/schema.sql THEN ani/supabase/seed.sql
(Until run, both serve seed/mock fallback — sites still work.)

PENDING — other:
- Push VissionLink + BigAni once correct GitHub remotes are confirmed.
- Harden ADMIN_SECRET on BigAni (currently default "bigani-admin").
- VissionLink ZOHO_SMTP_PASS is set; contact form + admin inbox should be live.

NEXT PLANNED WORK (in order): BigAni #1 order persistence + checkout writing to
the DB (orders table exists; checkout is still client/mock) → #2 farmer/buyer
auth → #3 PayMongo payments → #4 image hosting (Supabase Storage).

Admin codes: VissionLink /admin = "vissionlink-admin"; BigAni /admin = "bigani-admin".

Start by confirming you've read memory, then ask me which task to tackle (default:
BigAni order persistence).
```
