# Adding listings to CineVerse store

Listings are rows in **`cineverse.products`** (Supabase, CineForce project `fhlkrenefobhshouuopc`).
Adding a listing = inserting a **row** (data), not a schema change.

## Required fields (intake template)

Collect this from each owner per item:

| Field | Notes |
|---|---|
| **Name** | e.g. "Sony FX6 Cinema Camera Kit" |
| **Category** | Camera · Lens · Lighting · Grip · Audio · Drone · Stabilizer · Monitor · Action Cam · Power |
| **Rent rate** | ₱/day (or mark "rent: no") |
| **For sale + price** | sale price ₱ (or "sell: no") |
| **Units available** | stock (integer) |
| **Owner name / email / phone** | used for the post-payment handoff (never shown publicly except first name) |
| **Operator** | available? + ₱/day, or no |
| **Description** | 1–2 sentences |
| **Image** | a **public URL** — see image rules below |
| **Badge** | optional ("Best seller", "New", …) |

Auto-derived: `slug` (from name), `for_rent`/`for_sale` flags.

## Image rules (the important part)

The store stores an **`image_url`** (a hosted link), not an uploaded file. The URL must be on
an allowed host (see `next.config.ts` → `images.remotePatterns`):

- ✅ **Supabase Storage** — `https://fhlkrenefobhshouuopc.supabase.co/storage/v1/object/public/<bucket>/<file>` (recommended; same project, already whitelisted)
- ✅ `images.unsplash.com`, `placehold.co`
- ❌ **Google Drive / Dropbox share links** — NOT direct image URLs and not whitelisted; they won't render.

To add a new host (e.g. Cloudinary), add it to `next.config.ts` remotePatterns first.

## Ways to add a listing

1. **Supabase Table Editor** → `cineverse` schema → `products` → Insert row. Works today.
2. **Send the filled template (+ image URL) to Claude** → inserted via the Supabase service-role API. Good stopgap; depends on Claude being in the loop.
3. **Admin form + photo upload** (to build) → one form, drag-in photo → uploads to Supabase Storage → publishes. The scalable, no-middleman path.
4. **Review-gated public "List your gear" form** (later) → owner submissions save as `is_active = false` → operator approves in admin → goes live.

## Recommended workflow

- **Launch:** curate. Owners send details + photos; operator (or Claude) publishes. Keep quality high.
- **Photos:** owners/operator upload to a public **Supabase Storage** bucket (e.g. `listings`); use that URL.
- **Scale:** build the admin form (#3), then the review-gated intake form (#4).
