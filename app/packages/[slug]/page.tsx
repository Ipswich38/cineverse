import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, ShieldCheck } from "lucide-react";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import { PackageQuoteButton, PackageRentButton } from "@/components/PackageQuoteModal";
import { PACKAGE_OFFERS } from "@/lib/package-offers";
import { getPackagesCached } from "@/lib/packages-data";
import { peso } from "@/lib/rental-pricing";

export function generateStaticParams() {
  return PACKAGE_OFFERS.map((offer) => ({ slug: offer.slug }));
}

export default async function PackageDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Live, DB-backed packages so admin price/inclusion edits show on the detail page.
  const packages = await getPackagesCached();
  const offer = packages.find((o) => o.slug === slug);
  if (!offer) notFound();

  return (
    <div className="app-container package-detail-page">
      <style>{CSS}</style>
      <Link href="/packages" className="back-link">
        <ArrowLeft size={16} /> Back to packages
      </Link>

      <header className="package-detail-hero">
        <div className="package-detail-image">
          <GearImagePlaceholder name={offer.name} minHeight={360} />
        </div>
        <div>
          <p className="package-eyebrow">{offer.eyebrow}</p>
          <h1>{offer.name}</h1>
          <p>{offer.description}</p>
        </div>
        <aside className="range-panel">
          <span>Package rate</span>
          <strong>{peso(offer.pricePerDay)}/day</strong>
          <p>Rent now — pay just 15% online to reserve (balance settled before or upon handover) and get your invoice and rental contract instantly. Planning a longer shoot and want a multi-day discount? Request a quote instead.</p>
          <PackageRentButton offer={offer}>Rent now</PackageRentButton>
          <PackageQuoteButton offer={offer} className="quote-button quote-button-secondary">Request a discount quote</PackageQuoteButton>
        </aside>
      </header>

      <div className="detail-grid">
        <section className="detail-section">
          <h2>Package includes</h2>
          <div className="detail-list">
            {offer.inclusions.map((item) => (
              <span key={item}><Check size={14} /> {item}</span>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h2>More details</h2>
          <div className="copy-stack">
            {offer.details.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h2>Admin reviews</h2>
          <div className="detail-list">
            {offer.reviewNotes.map((note) => (
              <span key={note}><ShieldCheck size={14} /> {note}</span>
            ))}
          </div>
        </section>

        <aside className="response-note">
          <Clock size={17} />
          <div>
            <strong>Fastest response: same business day</strong>
            <p>Requests are logged for admin review. Pricing may vary after review, but the team can usually respond fastest when dates, location, and additional requests are complete.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.package-detail-page {
  padding: 28px 0 76px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #15130f;
  text-decoration: none;
  margin-bottom: 18px;
  font-size: 13px;
}
.package-detail-hero {
  display: grid;
  grid-template-columns: minmax(280px, 460px) minmax(0, 1fr) minmax(280px, 360px);
  gap: 18px;
  align-items: start;
}
.package-detail-image {
  min-height: 360px;
  overflow: hidden;
  border-radius: 8px;
}
.package-eyebrow {
  margin: 0 0 7px;
  color: #6c675f;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.package-detail-hero h1 {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 0.96;
  font-weight: 500;
  letter-spacing: 0;
}
.package-detail-hero p {
  color: #6c675f;
  line-height: 1.7;
  margin: 14px 0 0;
}
.range-panel {
  background: #f3efe5;
  border: 1px solid rgba(17,17,17,0.1);
  border-radius: 8px;
  padding: 18px;
  display: grid;
  gap: 10px;
}
.range-panel span {
  color: #6c675f;
  font-size: 11px;
}
.range-panel strong {
  font-family: "Jost", sans-serif;
  font-size: 24px;
  font-weight: 600;
}
.range-panel p {
  margin: 0;
  color: #6c675f;
  font-size: 12px;
  line-height: 1.6;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}
.detail-section,
.response-note {
  background: #fffdf8;
  border: 1px solid rgba(17,17,17,0.1);
  border-radius: 8px;
  padding: 18px;
}
.detail-section h2 {
  margin: 0 0 12px;
  font-family: "Jost", sans-serif;
  font-size: 22px;
  font-weight: 500;
}
.detail-list {
  display: grid;
  gap: 10px;
}
.detail-list span {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: #28241d;
  font-size: 13px;
  line-height: 1.4;
}
.detail-list svg,
.response-note svg {
  color: #9a7100;
  flex: 0 0 auto;
  margin-top: 2px;
}
.copy-stack {
  display: grid;
  gap: 10px;
}
.copy-stack p,
.response-note p {
  margin: 0;
  color: #6c675f;
  font-size: 13px;
  line-height: 1.65;
}
.response-note {
  display: flex;
  gap: 10px;
}
.response-note strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}
.quote-button {
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
.quote-button:disabled {
  opacity: 0.62;
  cursor: progress;
}
.range-panel .quote-button { width: 100%; margin-top: 10px; }
.quote-button-secondary {
  background: transparent;
  border: 1px solid rgba(17,17,17,0.2);
  font-weight: 600;
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
.quote-modal h2,
.sent-state h2 {
  margin: 0;
  font-family: "Jost", sans-serif;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 500;
  letter-spacing: 0;
}
.packages-eyebrow {
  margin: 0 0 6px;
  color: #6c675f;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.modal-copy,
.modal-disclaimer {
  color: #6c675f;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
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
  .package-detail-hero {
    grid-template-columns: 1fr;
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .package-detail-page {
    padding-top: 18px;
  }
  .date-row {
    grid-template-columns: 1fr;
  }
  .quote-modal {
    padding: 20px;
  }
}
`;
