"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Mail, MapPin, Package } from "lucide-react";
import { useStore } from "@/app/providers";
import EquipmentCard from "@/components/EquipmentCard";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import type { ProviderProfile } from "@/lib/providers";
import { PACKAGE_OFFERS } from "@/lib/package-offers";

// Shared, data-driven provider storefront. Renders any ProviderProfile as a
// branded "store page": full-bleed brand banner up top, then the provider's
// featured gear, their packages, and a slim "list your gear" footer. The brand
// mark / name / accent come from the profile so each store has its own identity
// while staying aligned to the site UI.
export default function ProviderStorefront({ profile }: { profile: ProviderProfile }) {
  const { catalog } = useStore();

  const items = catalog.filter((item) => profile.ownerMatches.includes(item.owner));
  const featured = items.filter((item) => item.featured);
  const gridItems = (featured.length >= 4 ? featured : items).slice(0, 8);
  const locations = Array.from(new Set(items.map((item) => item.location).filter(Boolean)));
  const featuredPackages = profile.hasPackages ? PACKAGE_OFFERS.slice(0, 3) : [];

  const bannerStyle = {
    background: `linear-gradient(160deg, ${profile.bannerFrom} 0%, ${profile.bannerTo} 100%)`,
    "--accent": profile.accent,
  } as React.CSSProperties;

  return (
    <div className="pstore">
      <style>{CSS}</style>

      {/* ── Brand banner ───────────────────────────────────────────────── */}
      <header className="pstore-banner" style={bannerStyle} aria-labelledby="pstore-title">
        <div className="pstore-banner-inner">
          <div className="pstore-mark" aria-hidden="true">
            <span>{profile.shortName}</span>
            <i />
          </div>

          {profile.verified && (
            <span className="pstore-verified">
              <BadgeCheck size={14} /> Verified provider
            </span>
          )}

          <h1 id="pstore-title" className="pstore-name">{profile.name}</h1>
          <p className="pstore-tagline">{profile.tagline}</p>
          <p className="pstore-about">{profile.about}</p>

          <div className="pstore-stats">
            <span><b>{items.length}</b> listed items</span>
            {profile.hasPackages && <span><b>{PACKAGE_OFFERS.length}</b> package offers</span>}
            {locations.length > 0 && (
              <span className="pstore-stat-loc"><MapPin size={13} /> {locations.join(" · ")}</span>
            )}
          </div>

          <div className="pstore-actions">
            <Link href={`/store?query=${encodeURIComponent(profile.storeQuery)}`} className="pstore-btn">
              Browse all gear <ArrowRight size={15} />
            </Link>
            {profile.hasPackages && (
              <Link href="/packages" className="pstore-btn pstore-btn--ghost">
                Request a quote
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="pstore-body">
        {/* ── Featured gear ────────────────────────────────────────────── */}
        {gridItems.length > 0 && (
          <section className="pstore-section" aria-label={`Gear from ${profile.name}`}>
            <div className="pstore-section-head">
              <div>
                <p className="section-kicker">In this store</p>
                <h2>Featured gear</h2>
              </div>
              <Link href={`/store?query=${encodeURIComponent(profile.storeQuery)}`} className="pstore-seeall">
                View all {items.length} items <ArrowRight size={14} />
              </Link>
            </div>
            <div className="product-grid">
              {gridItems.map((item) => <EquipmentCard key={item.id} item={item} />)}
            </div>
          </section>
        )}

        {/* ── Packages ─────────────────────────────────────────────────── */}
        {featuredPackages.length > 0 && (
          <section className="pstore-section" aria-label={`Packages from ${profile.name}`}>
            <div className="pstore-section-head">
              <div>
                <p className="section-kicker">Bundled & reviewed</p>
                <h2>Production packages</h2>
              </div>
              <Link href="/packages" className="pstore-seeall">
                <Package size={14} /> All packages
              </Link>
            </div>
            <div className="pstore-pkg-grid">
              {featuredPackages.map((offer) => (
                <Link href={`/packages/${offer.slug}`} className="pstore-pkg-card" key={offer.id}>
                  <div className="pstore-pkg-image">
                    <GearImagePlaceholder name={offer.name} />
                  </div>
                  <div className="pstore-pkg-body">
                    <p>{offer.eyebrow}</p>
                    <h3>{offer.name}</h3>
                    <span className="pstore-pkg-price">{offer.priceRange}</span>
                  </div>
                  <ArrowRight className="pstore-pkg-arrow" size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Become a provider ────────────────────────────────────────── */}
        <section className="pstore-recruit">
          <div>
            <h2>Own production gear?</h2>
            <p>
              VissionLink is opening paid provider storefronts for trusted equipment owners. Get your own branded store like this one —
              send your item list, rates, photos, and location and we&apos;ll review fit and pricing.
            </p>
          </div>
          <a
            href={`mailto:${profile.contactEmail}?subject=${encodeURIComponent("List my equipment on VissionLink")}`}
            className="primary-button"
            style={{ textDecoration: "none", whiteSpace: "nowrap" }}
          >
            <Mail size={16} /> Become a provider
          </a>
        </section>
      </div>
    </div>
  );
}

const CSS = `
.pstore-body { padding-bottom: 76px; }

/* ── Full-bleed brand banner ────────────────────────────────────────────── */
.pstore-banner {
  color: #fffdf8;
  margin-left: calc(50% - 50vw / var(--ui-scale));
  margin-right: calc(50% - 50vw / var(--ui-scale));
  padding-left: calc(50vw / var(--ui-scale) - 50%);
  padding-right: calc(50vw / var(--ui-scale) - 50%);
  border-bottom: 1px solid rgba(255,255,255,.10);
}
.pstore-banner-inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 40px 0 38px;
  max-width: 760px;
}
.pstore-mark {
  position: relative;
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: #1f1f1f;
  border: 1px solid rgba(255,255,255,.18);
  font-family: "Jost", sans-serif;
  font-weight: 600;
  letter-spacing: -0.06em;
  font-size: 22px;
  overflow: hidden;
}
.pstore-mark i {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 15px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent, #f5c518);
}
.pstore-verified {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.16);
  color: var(--accent, #f5c518);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .02em;
}
.pstore-name {
  font-family: "Jost", sans-serif;
  font-size: clamp(2rem, 5vw, 3.1rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
  margin: 2px 0 0;
}
.pstore-tagline {
  color: var(--accent, #f5c518);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .02em;
  margin: 0;
}
.pstore-about {
  max-width: 620px;
  color: rgba(255,253,248,.74);
  font-size: 13.5px;
  line-height: 1.65;
  margin: 4px 0 0;
}
.pstore-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
.pstore-stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  background: rgba(255,255,255,.07);
  color: rgba(255,253,248,.86);
  font-size: 12px;
}
.pstore-stats b { color: var(--accent, #f5c518); }
.pstore-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
.pstore-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--accent, #f5c518);
  color: #15130f;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
}
.pstore-btn--ghost {
  background: transparent;
  color: #fffdf8;
  border: 1px solid rgba(255,255,255,.22);
}

/* ── Sections ───────────────────────────────────────────────────────────── */
.pstore-section { margin-top: 34px; }
.pstore-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.pstore-section-head h2 {
  font-family: "Jost", sans-serif;
  font-size: 24px;
  letter-spacing: -0.04em;
  margin: 6px 0 0;
}
.pstore-seeall {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #15130f;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.pstore-seeall:hover { color: var(--amber-strong, #d8a800); }

/* ── Packages ───────────────────────────────────────────────────────────── */
.pstore-pkg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}
.pstore-pkg-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  gap: 13px;
  align-items: center;
  padding: 12px;
  background: var(--panel, #fffdf8);
  color: #15130f;
  text-decoration: none;
  border: 1px solid rgba(17,17,17,.1);
}
.pstore-pkg-card:hover { border-color: var(--amber-strong, #d8a800); }
.pstore-pkg-image {
  width: 92px;
  height: 92px;
  overflow: hidden;
  background: #f0ece3;
}
.pstore-pkg-body p {
  color: #9a7100;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin: 0 0 5px;
}
.pstore-pkg-body h3 {
  font-family: "Jost", sans-serif;
  font-size: 15px;
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin: 0 0 6px;
}
.pstore-pkg-price { color: #6c675f; font-size: 12px; }
.pstore-pkg-arrow { color: #9a7100; }

/* ── Become a provider ──────────────────────────────────────────────────── */
.pstore-recruit {
  margin-top: 40px;
  padding: 22px;
  background: var(--panel-2, #f0ece3);
  border: 1px solid rgba(17,17,17,.1);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pstore-recruit h2 {
  font-family: "Jost", sans-serif;
  font-size: 21px;
  letter-spacing: -0.03em;
  margin: 0;
}
.pstore-recruit p {
  max-width: 620px;
  color: #6c675f;
  font-size: 13px;
  line-height: 1.6;
  margin: 7px 0 0;
}

@media (max-width: 640px) {
  .pstore-banner-inner { padding: 30px 0 28px; }
  .pstore-section-head { flex-direction: column; align-items: flex-start; gap: 8px; }
}
`;
