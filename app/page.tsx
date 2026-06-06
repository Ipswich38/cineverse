"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Package, Store } from "lucide-react";
import { useStore } from "./providers";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import EquipmentCard from "@/components/EquipmentCard";
import WhyBmr from "@/components/WhyBmr";
import type { EquipmentItem } from "@/lib/catalog";
import { COMPANY } from "@/lib/company";
import { peso } from "@/lib/rental-pricing";

const FALLBACK_IMAGES = {
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
  lens: "https://images.unsplash.com/photo-1606986628253-7ee7a180b61c?auto=format&fit=crop&w=900&q=80",
  support: "https://images.unsplash.com/photo-1492691527719-9bce0f3b5ad4?auto=format&fit=crop&w=900&q=80",
  lighting: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  audio: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  drone: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=900&q=80",
  production: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
};

function carouselImageFor(item: EquipmentItem) {
  const haystack = `${item.name} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
  if (haystack.includes("tilta") || haystack.includes("nucleus") || haystack.includes("follow focus")) return FALLBACK_IMAGES.support;

  const image = item.images.find((src) => src?.trim());
  if (image) return image;

  if (haystack.includes("drone") || haystack.includes("mavic")) return FALLBACK_IMAGES.drone;
  if (haystack.includes("audio") || haystack.includes("sound") || haystack.includes("mic") || haystack.includes("speaker")) return FALLBACK_IMAGES.audio;
  if (haystack.includes("light") || haystack.includes("aputure") || haystack.includes("nanlux") || haystack.includes("pavotube")) return FALLBACK_IMAGES.lighting;
  if (haystack.includes("lens") || haystack.includes("filter")) return FALLBACK_IMAGES.lens;
  if (haystack.includes("gimbal") || haystack.includes("tripod") || haystack.includes("stand") || haystack.includes("grip")) return FALLBACK_IMAGES.support;
  if (haystack.includes("production") || haystack.includes("operator")) return FALLBACK_IMAGES.production;
  return FALLBACK_IMAGES.camera;
}

export default function HomePage() {
  const { catalog } = useStore();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const previewItems = catalog.slice(0, 6);
  const carouselItems = catalog.slice(0, 12);
  const bmrItems = catalog.filter((item) => item.owner === "Vissionlink Rentals" || item.owner === COMPANY.legalName);
  const featuredSets = (bmrItems.filter((i) => i.featured).length ? bmrItems.filter((i) => i.featured) : bmrItems).slice(0, 4);
  const scrollCarousel = (direction: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.72), behavior: "smooth" });
  };
  const renderCarouselItem = (item: EquipmentItem) => (
    <Link href="/providers" className="landing-carousel-item" key={item.id}>
      <div className="landing-carousel-image">
        <GearImagePlaceholder name={item.name} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={carouselImageFor(item)}
          alt={item.name}
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGES.camera;
          }}
        />
      </div>
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div className="app-container landing-page" style={{ padding: "0 0 64px" }}>
      <style>{CSS}</style>
      <section className="hero-video-section">
        <div className="hero-panel">
          <div style={{ position: "absolute", inset: 0 }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.04) saturate(0.92)" }}
            >
              <source src="/videos/hero-production.mp4" type="video/mp4" />
            </video>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.48) 46%, rgba(0,0,0,0.7) 100%)" }} />
          </div>
          <div className="hero-copy landing-hero-copy">
            <p className="hero-kicker">Film / TV / Entertainment Rentals</p>
            <h1 className="landing-hero-title" style={{ fontFamily: '"Jost", sans-serif', color: "#fffdf8" }}>
              Production gear, reserved in minutes.
            </h1>
            <p className="landing-hero-text">
              VissionLink keeps rental discovery, availability, rental duration, and downpayment reservation in one clean flow for production teams.
            </p>
            <div className="landing-hero-actions">
              <Link href="/store" className="hero-cta-primary">
                Browse catalog <ArrowRight size={16} />
              </Link>
              <Link href="/providers" className="hero-cta-secondary">
                Request quotation
              </Link>
            </div>
          </div>
        </div>

      </section>

      <section className="landing-item-carousel" aria-label="Browse popular gear">
        <button className="landing-carousel-arrow landing-carousel-arrow--left" type="button" aria-label="Scroll carousel left" onClick={() => scrollCarousel(-1)}>
          <ChevronLeft size={34} strokeWidth={1.7} />
        </button>
        <div className="landing-carousel-viewport" ref={carouselRef}>
          <div className="landing-carousel-track">
            {carouselItems.map((item) => renderCarouselItem(item))}
          </div>
        </div>
        <button className="landing-carousel-arrow landing-carousel-arrow--right" type="button" aria-label="Scroll carousel right" onClick={() => scrollCarousel(1)}>
          <ChevronRight size={34} strokeWidth={1.7} />
        </button>
      </section>

      <section className="landing-provider-feature" aria-labelledby="featured-provider-title">
        <div className="landing-provider-panel">
          <div className="landing-provider-summary">
            <p className="section-kicker">Featured provider</p>
            <Store size={24} color="#d8a800" />
            <h2 id="featured-provider-title">BMR Cinema Operation Services</h2>
            <p>
              The owner-operator behind VissionLink, offering reviewed camera, monitoring, lighting, grip, drone, and production support packages for film and commercial shoots.
            </p>
            <div className="landing-provider-stats">
              <span><b>{bmrItems.length}</b> rental sets</span>
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

          <div className="landing-package-list" aria-label="Featured BMR rental sets">
            {featuredSets.map((it) => (
              <Link href={`/gear/${it.slug}`} className="landing-package-card" key={it.id}>
                <div className="landing-package-image">
                  <GearImagePlaceholder name={it.name} />
                </div>
                <div>
                  <p>Rental set</p>
                  <h3>{it.name}</h3>
                  <span>{peso(it.ratePerDay)}/day</span>
                </div>
                <ArrowRight className="landing-package-arrow" size={16} />
              </Link>
            ))}
            <Link href="/store" className="landing-package-all">
              <Package size={16} />
              Browse all sets
            </Link>
          </div>
        </div>
      </section>

      <WhyBmr />

      <section style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <p className="section-kicker">Featured inventory</p>
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 26, letterSpacing: "-0.04em", margin: "6px 0 0" }}>
              Premium gear ready to rent
            </h2>
          </div>
          <Link href="/store" style={{ color: "#15130f", textDecoration: "none", fontWeight: 700 }}>
            View all
          </Link>
        </div>
        <div className="product-grid">
          {previewItems.map((item) => <EquipmentCard key={item.id} item={item} />)}
        </div>
      </section>

      <section style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(17,17,17,0.12)", display: "flex", gap: 12, alignItems: "center", color: "#6c675f" }}>
        <CheckCircle2 size={18} color="#9a7100" />
        <span>Tap any item to view packages where it belongs, then send a quotation request for admin review.</span>
      </section>
    </div>
  );
}

const CSS = `
.landing-page .hero-video-section {
  /* Full-bleed; 50vw divided by --ui-scale to offset the body zoom (see globals). */
  margin: 0 calc(50% - 50vw / var(--ui-scale));
  min-height: clamp(520px, calc(100vh / var(--ui-scale) - 132px), 720px);
  padding: 0;
}
.landing-page .hero-panel {
  min-height: inherit;
  margin: 0;
}
.landing-page .hero-copy {
  max-width: 650px;
  padding: clamp(34px, 6.2vw, 92px);
}
.landing-hero-copy {
  display: grid;
  justify-items: start;
}
.landing-hero-title {
  max-width: 620px;
  font-size: clamp(2.4rem, 4.1vw, 3.75rem);
  line-height: 1.03;
  letter-spacing: -0.035em;
  margin: 14px 0 20px;
}
.landing-hero-text {
  max-width: 560px;
  color: rgba(255,253,248,0.82);
  font-size: 15px;
  line-height: 1.75;
  margin: 0;
}
.landing-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}
.landing-item-carousel {
  position: relative;
  margin: 0 calc(50% - 50vw / var(--ui-scale));
  background: #fffdf8;
  border-top: 1px solid rgba(17,17,17,0.06);
  border-bottom: 1px solid rgba(17,17,17,0.06);
  overflow: hidden;
  --carousel-gap: 24px;
}
.landing-carousel-viewport {
  width: min(1320px, calc(100% - 48px));
  margin: 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  -ms-overflow-style: none;
  scrollbar-width: none;
  mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%);
  scroll-behavior: smooth;
}
.landing-carousel-viewport::-webkit-scrollbar {
  display: none;
}
.landing-carousel-track {
  display: flex;
  gap: var(--carousel-gap);
  padding: 16px 0 18px;
  width: max-content;
}
.landing-carousel-item {
  flex: 0 0 132px;
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
  color: #4f4b44;
  text-decoration: none;
}
.landing-carousel-image {
  width: 150px;
  height: 92px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background: #f8f5ef;
  border: 1px solid rgba(17,17,17,0.07);
  box-shadow: 0 10px 24px rgba(17,17,17,0.08);
}
.landing-carousel-image [aria-label] {
  border: 0 !important;
}
.landing-carousel-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.landing-carousel-image [aria-label] > div {
  gap: 4px !important;
}
.landing-carousel-image [aria-label] span {
  display: none;
}
.landing-carousel-item span {
  font-size: 12px;
  line-height: 1.25;
  min-height: 30px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.landing-carousel-item:hover span {
  color: #15130f;
  text-decoration: underline;
}
.landing-carousel-arrow {
  position: absolute;
  top: 50%;
  z-index: 3;
  width: clamp(42px, 5vw, 64px);
  height: clamp(64px, 8vw, 92px);
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  border: 0;
  color: rgba(21,19,15,.68);
  background: rgba(255,253,248,.58);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}
.landing-carousel-arrow:hover {
  color: #15130f;
  background: rgba(255,253,248,.9);
  transform: translateY(-50%) scale(1.02);
}
.landing-carousel-arrow--left {
  left: 0;
}
.landing-carousel-arrow--right {
  right: 0;
}
.landing-provider-feature {
  margin-top: 26px;
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
  .landing-page .hero-video-section {
    min-height: 560px;
  }
  .landing-page .hero-copy {
    padding: 28px 22px;
    align-self: end;
  }
  .landing-hero-title {
    font-size: clamp(2.25rem, 12vw, 3.15rem);
    line-height: 1;
    margin: 12px 0 16px;
  }
  .landing-hero-text {
    font-size: 13.5px;
    line-height: 1.65;
  }
  .landing-hero-actions {
    gap: 10px;
    margin-top: 22px;
  }
  .landing-item-carousel {
    --carousel-gap: 16px;
  }
  .landing-carousel-viewport {
    width: min(100% - 28px, 1320px);
  }
  .landing-carousel-track {
    padding: 14px 0 16px;
  }
  .landing-carousel-item {
    flex-basis: 112px;
  }
  .landing-carousel-image {
    width: 124px;
    height: 78px;
  }
  .landing-carousel-arrow {
    width: 38px;
    height: 66px;
  }
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
