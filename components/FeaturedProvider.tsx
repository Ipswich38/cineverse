"use client";

import Link from "next/link";
import { ArrowRight, Package, Store } from "lucide-react";
import { useStore } from "@/app/providers";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import { COMPANY } from "@/lib/company";
import { PACKAGE_OFFERS } from "@/lib/package-offers";

// The "Featured provider" panel that leads the front page, extracted so the Store
// and Packages pages can open with the same section. Self-contained: it pulls its
// own data and ships its own styles, so it renders identically wherever it's used.
export default function FeaturedProvider() {
  const { catalog } = useStore();
  const bmrItems = catalog.filter((item) => item.owner === "Vissionlink Rentals" || item.owner === COMPANY.legalName);
  const featuredPackages = PACKAGE_OFFERS.slice(0, 4);

  return (
    <section className="landing-provider-feature" aria-labelledby="featured-provider-title">
      <style>{CSS}</style>
      <div className="landing-provider-panel">
        <div className="landing-provider-summary">
          <p className="section-kicker">Featured provider</p>
          <Store size={24} color="#d8a800" />
          <h2 id="featured-provider-title">BMR Cinema Operation Services</h2>
          <p>
            The owner-operator behind VissionLink, offering reviewed camera, monitoring, lighting, grip, drone, and production support packages for film and commercial shoots.
          </p>
          <div className="landing-provider-stats">
            <span><b>{bmrItems.length}</b> listed items</span>
            <span><b>{PACKAGE_OFFERS.length}</b> package offers</span>
          </div>
          <div className="landing-provider-actions">
            <Link href="/providers" className="landing-provider-link">
              View provider
            </Link>
            <Link href={`/store?query=${encodeURIComponent("Vissionlink Rentals")}`} className="landing-provider-link secondary">
              Browse BMR gear
            </Link>
          </div>
        </div>

        <div className="landing-package-list" aria-label="BMR package offers">
          {featuredPackages.map((offer) => (
            <Link href={`/packages/${offer.slug}`} className="landing-package-card" key={offer.id}>
              <div className="landing-package-image">
                <GearImagePlaceholder name={offer.name} />
              </div>
              <div>
                <p>{offer.eyebrow}</p>
                <h3>{offer.name}</h3>
                <span>{offer.priceRange}</span>
              </div>
              <ArrowRight className="landing-package-arrow" size={16} />
            </Link>
          ))}
          <Link href="/packages" className="landing-package-all">
            <Package size={16} />
            View all packages
          </Link>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.landing-provider-feature {
  margin-top: 0;
}
.landing-provider-panel {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  background: #11100e;
  color: #fffdf8;
  border: 1px solid rgba(17,17,17,.12);
  box-shadow: 0 16px 38px rgba(17,17,17,.16);
}
.landing-provider-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  padding: 12px;
}
.landing-provider-summary .section-kicker {
  color: #f5c518;
}
.landing-provider-summary h2 {
  font-family: "Jost", sans-serif;
  font-size: clamp(1.65rem, 3vw, 2.35rem);
  line-height: 1;
  letter-spacing: -0.04em;
  margin: 0;
}
.landing-provider-summary p {
  max-width: 520px;
  color: rgba(255,253,248,.76);
  font-size: 13px;
  line-height: 1.65;
  margin: 0;
}
.landing-provider-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}
.landing-provider-stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 9px;
  background: rgba(255,255,255,.08);
  color: rgba(255,253,248,.84);
  font-size: 12px;
}
.landing-provider-stats b {
  color: #f5c518;
}
.landing-provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.landing-provider-link {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 13px;
  background: #f5c518;
  color: #15130f;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
.landing-provider-link.secondary {
  background: transparent;
  color: #fffdf8;
  border: 1px solid rgba(255,255,255,.18);
}
.landing-package-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.landing-package-card {
  min-height: 124px;
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  background: #fffaf0;
  color: #15130f;
  text-decoration: none;
  border: 1px solid rgba(255,255,255,.08);
}
.landing-package-card:hover h3 {
  text-decoration: underline;
  text-decoration-color: #d8a800;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
.landing-package-image {
  width: 86px;
  height: 86px;
  overflow: hidden;
  background: #f0ece3;
}
.landing-package-card p {
  color: #9a7100;
  font-size: 10px;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: .08em;
  margin: 0 0 5px;
}
.landing-package-card h3 {
  font-family: "Jost", sans-serif;
  font-size: 15px;
  line-height: 1.08;
  letter-spacing: -0.025em;
  margin: 0 0 8px;
}
.landing-package-card span {
  color: #6c675f;
  font-size: 12px;
}
.landing-package-arrow {
  color: #9a7100;
}
.landing-package-all {
  min-height: 42px;
  grid-column: 1 / -1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fffdf8;
  border: 1px solid rgba(255,255,255,.16);
  text-decoration: none;
  font-size: 13px;
}
.landing-package-all:hover {
  background: #f5c518;
  color: #15130f;
}
@media (max-width: 640px) {
  .landing-provider-panel {
    grid-template-columns: 1fr;
    padding: 14px;
  }
  .landing-provider-summary {
    padding: 4px;
  }
  .landing-package-list {
    grid-template-columns: 1fr;
  }
  .landing-package-card {
    min-height: 112px;
    grid-template-columns: 76px minmax(0, 1fr) auto;
  }
  .landing-package-image {
    width: 76px;
    height: 76px;
  }
}
`;
