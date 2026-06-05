import { COMPANY } from "./company";

// ── Provider profiles ────────────────────────────────────────────────────────
// Each provider gets a branded storefront on VissionLink (Shopify-style), driven
// by the profile below. The storefront UI is shared (components/ProviderStorefront)
// so every store stays aligned to the site, while name / mark / accent / banner
// give each one its own identity. Add a new provider by appending a profile and
// (later) wiring a /providers/[slug] route.

export type ProviderProfile = {
  /** URL slug (reserved for future /providers/[slug] routes). */
  slug: string;
  /** Full store / legal name shown as the storefront title. */
  name: string;
  /** Short label rendered inside the brand mark, e.g. "BMR". */
  shortName: string;
  /** Catalog `owner` values that belong to this provider (gear is filtered by these). */
  ownerMatches: string[];
  /** Query string used to deep-link into the store filtered to this provider. */
  storeQuery: string;
  /** One-line specialties, e.g. "Camera · Lighting · Grip · Drone". */
  tagline: string;
  /** Longer store description for the banner. */
  about: string;
  /** Approved provider badge. */
  verified: boolean;
  /** Whether this provider's gear is bundled into the package offers. */
  hasPackages: boolean;
  /** Contact email for inquiries. */
  contactEmail: string;
  /** Per-provider identity: brand accent + banner gradient (kept within the site palette). */
  accent: string;
  bannerFrom: string;
  bannerTo: string;
};

export const BMR_PROVIDER: ProviderProfile = {
  slug: "bmr",
  name: COMPANY.legalName, // "BMR Cinema Operation Services"
  shortName: "BMR",
  ownerMatches: ["Vissionlink Rentals", COMPANY.legalName],
  storeQuery: "Vissionlink Rentals",
  tagline: "Camera · Lighting · Grip · Audio · Drone · Production support",
  about:
    "The owner-operator behind VissionLink. BMR Cinema Operation Services supplies reviewed camera, monitoring, lighting, grip, drone, and production-support gear for film, TV, and commercial shoots across Metro Manila.",
  verified: true,
  hasPackages: true,
  contactEmail: COMPANY.email,
  accent: "#f5c518",
  bannerFrom: "#161412",
  bannerTo: "#0c0b0a",
};

export const PROVIDERS: ProviderProfile[] = [BMR_PROVIDER];

export function providerBySlug(slug: string): ProviderProfile | undefined {
  return PROVIDERS.find((p) => p.slug === slug);
}
