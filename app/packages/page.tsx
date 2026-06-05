"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock, Package, Send } from "lucide-react";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import { PackageQuoteButton } from "@/components/PackageQuoteModal";
import FeaturedProvider from "@/components/FeaturedProvider";
import { PACKAGE_OFFERS, packagesForItemSlug } from "@/lib/package-offers";

export default function PackagesPage() {
  return (
    <Suspense fallback={<div className="app-container packages-page">Loading packages...</div>}>
      <PackagesContent />
    </Suspense>
  );
}

function PackagesContent() {
  const searchParams = useSearchParams();
  const itemSlug = searchParams.get("item") ?? "";
  const offers = useMemo(() => (itemSlug ? packagesForItemSlug(itemSlug) : PACKAGE_OFFERS), [itemSlug]);
  const itemLabel = itemSlug ? itemSlug.replace(/-/g, " ") : "";

  return (
    <div className="app-container packages-page">
      <style>{CSS}</style>

      <div style={{ marginBottom: 26 }}>
        <FeaturedProvider />
      </div>

      <header className="packages-hero">
        <div className="packages-hero-icon"><Package size={22} /></div>
        <div>
          <p className="packages-eyebrow">BMR package quotation</p>
          <h1>Production packages reviewed for your shoot</h1>
          <p>
            Choose a listed package, review the price range, then request a quotation. Exact pricing is still confirmed by admin because final rates can change
            based on dates, scope, crew, transportation, location, availability, VAT, and bundle discounts.
          </p>
        </div>
      </header>

      {itemSlug && (
        <div className="filter-note">
          <span>Showing packages that include: <strong>{itemLabel}</strong></span>
          <Link href="/packages">View all packages</Link>
        </div>
      )}

      <section className="package-grid" aria-label="Production packages">
        {offers.map((offer) => (
          <article className="package-card" key={offer.id}>
            <Link href={`/packages/${offer.slug}`} className="package-image-link" aria-label={`View ${offer.name}`}>
              <GearImagePlaceholder name={offer.name} />
            </Link>
            <div>
              <p className="package-card-eyebrow">{offer.eyebrow}</p>
              <h2>{offer.name}</h2>
              <p className="package-description">{offer.description}</p>
            </div>

            <div className="price-range">
              <span>Price range</span>
              <strong>{offer.priceRange}</strong>
            </div>

            <div className="inclusion-list">
              {offer.inclusions.slice(0, 4).map((inclusion) => (
                <span key={inclusion}><Check size={13} /> {inclusion}</span>
              ))}
            </div>

            <p className="best-for">{offer.bestFor}</p>
            <div className="package-actions">
              <PackageQuoteButton offer={offer}>
                Ask a quotation
              </PackageQuoteButton>
              <Link href={`/packages/${offer.slug}`} className="package-detail-link">
                Details <Send size={13} />
              </Link>
            </div>
          </article>
        ))}
      </section>

      {offers.length === 0 && (
        <div className="empty-package-filter">
          <h2>No package currently lists this item</h2>
          <p>Try viewing all packages or request a custom quotation so admin can review whether this item can be bundled.</p>
          <Link href="/packages" className="package-detail-link">View all packages</Link>
        </div>
      )}

      <aside className="pricing-note">
        <Clock size={16} />
        <span>Displayed ranges are planning guides only. Once sent, your request is logged for admin review and the quickest response is usually within the same business day.</span>
      </aside>
    </div>
  );
}

const CSS = `
.packages-page {
  padding: 28px 0 76px;
}
.packages-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 780px);
  gap: 14px;
  align-items: start;
  margin-bottom: 22px;
}
.packages-hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #f5c518;
  color: #15130f;
}
.packages-eyebrow,
.package-card-eyebrow {
  margin: 0 0 6px;
  color: #6c675f;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.packages-hero h1 {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: 0;
}
.packages-hero p:not(.packages-eyebrow) {
  max-width: 760px;
  color: #6c675f;
  line-height: 1.7;
  margin: 12px 0 0;
}
.package-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.filter-note {
  margin: -4px 0 16px;
  padding: 12px 14px;
  border: 1px solid rgba(17,17,17,0.1);
  background: #fffdf8;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #6c675f;
  font-size: 13px;
}
.filter-note strong {
  color: #15130f;
  text-transform: capitalize;
}
.filter-note a {
  color: #15130f;
  font-weight: 600;
}
.package-card {
  display: grid;
  gap: 16px;
  align-content: start;
  padding: 12px;
  border: 1px solid rgba(17,17,17,0.1);
  background: #f3efe5;
  border-radius: 8px;
  min-height: 100%;
}
.package-image-link {
  display: block;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 6px;
  text-decoration: none;
}
.package-card > div:not(.package-actions):not(.inclusion-list):not(.price-range),
.package-card > p,
.package-card > .price-range,
.package-card > .inclusion-list,
.package-card > .package-actions {
  margin-left: 6px;
  margin-right: 6px;
}
.package-card h2,
.quote-modal h2,
.sent-state h2 {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 500;
  letter-spacing: 0;
}
.package-description,
.best-for,
.modal-copy,
.modal-disclaimer {
  color: #6c675f;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.price-range {
  display: grid;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid rgba(17,17,17,0.11);
  background: #fffdf8;
  border-radius: 8px;
}
.price-range span {
  color: #6c675f;
  font-size: 11px;
}
.price-range strong {
  color: #15130f;
  font-size: 15px;
  font-weight: 600;
}
.inclusion-list {
  display: grid;
  gap: 8px;
}
.inclusion-list span {
  display: flex;
  gap: 7px;
  align-items: flex-start;
  color: #28241d;
  font-size: 13px;
  line-height: 1.35;
}
.inclusion-list svg {
  color: #9a7100;
  flex: 0 0 auto;
  margin-top: 2px;
}
.package-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.quote-button,
.package-detail-link {
  border: none;
  background: #f5c518;
  color: #15130f;
  border-radius: 999px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.package-detail-link {
  background: #fffdf8;
  border: 1px solid rgba(17,17,17,0.14);
}
.quote-button:disabled {
  opacity: 0.62;
  cursor: progress;
}
.pricing-note {
  margin-top: 16px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  color: #6c675f;
  font-size: 13px;
  line-height: 1.5;
  max-width: 780px;
}
.pricing-note svg {
  color: #9a7100;
  flex: 0 0 auto;
}
.empty-package-filter {
  margin-top: 16px;
  padding: 22px;
  border: 1px solid rgba(17,17,17,0.1);
  background: #fffdf8;
}
.empty-package-filter h2 {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 24px;
  font-weight: 500;
}
.empty-package-filter p {
  margin: 8px 0 14px;
  color: #6c675f;
  line-height: 1.6;
}
.quote-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(10, 9, 7, 0.48);
  display: grid;
  place-items: center;
  padding: 18px;
}
.quote-modal {
  position: relative;
  width: min(620px, 100%);
  max-height: min(86vh, 820px);
  overflow: auto;
  background: #f8f3e8;
  color: #15130f;
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 28px 80px rgba(0,0,0,0.28);
}
.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  border: 1px solid rgba(17,17,17,0.14);
  background: #fffdf8;
  color: #15130f;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.form-grid {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.modal-disclaimer {
  margin-top: 12px;
  font-size: 12px;
}
.form-error {
  margin: 10px 0 0;
  color: #b3261e;
  font-size: 13px;
}
.modal-submit {
  width: 100%;
  margin-top: 14px;
}
.sent-state {
  text-align: center;
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 16px 4px 4px;
}
.sent-state svg {
  color: #1f9d55;
}
.sent-state p {
  color: #6c675f;
  line-height: 1.7;
  margin: 0 0 8px;
}
@media (max-width: 980px) {
  .package-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .packages-page {
    padding-top: 18px;
  }
  .packages-hero {
    grid-template-columns: 1fr;
  }
  .package-grid {
    grid-template-columns: 1fr;
  }
  .date-row {
    grid-template-columns: 1fr;
  }
  .quote-modal {
    padding: 20px;
  }
}
`;
