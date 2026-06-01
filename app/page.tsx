"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Truck, Wallet } from "lucide-react";
import { useStore } from "./providers";
import EquipmentCard from "@/components/EquipmentCard";

const highlights = [
  { icon: ShieldCheck, title: "Admin-managed inventory", text: "Your client can approve, edit, and publish supplier equipment from one private dashboard." },
  { icon: Wallet, title: "Downpayment checkout", text: "Customers reserve equipment, choose rental duration, and pay the downpayment first." },
  { icon: Truck, title: "Supplier intake workflow", text: "Other owners can submit item images and inventory for posting." },
  { icon: Clock3, title: "Rental duration control", text: "Daily, weekly, or custom rental windows are captured before payment." },
];

export default function HomePage() {
  const { catalog } = useStore();
  const featured = catalog.filter((item) => item.featured).slice(0, 3);
  const previewItems = catalog.slice(0, 6);

  return (
    <div className="app-container" style={{ padding: "20px 0 64px" }}>
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
          <div className="hero-copy">
            <p className="hero-kicker">Film / TV / Entertainment Rentals</p>
            <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2.25rem, 5vw, 4rem)", lineHeight: 0.96, letterSpacing: "-0.05em", margin: "10px 0 12px", color: "#fffdf8" }}>
              Production gear, reserved in minutes.
            </h1>
            <p style={{ maxWidth: 600, color: "rgba(255,253,248,0.82)", fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              VissionLink keeps rental discovery, availability, rental duration, and downpayment reservation in one clean flow for production teams.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
              <Link href="/store" className="hero-cta-primary">
                Browse catalog <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="hero-cta-secondary">
                List your gear
              </Link>
            </div>
          </div>
        </div>

      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 14 }}>
        {highlights.map(({ icon: Icon, title, text }) => (
          <div key={title} style={{ padding: "4px 0" }}>
            <Icon size={16} color="#9a7100" />
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 17, margin: "10px 0 6px" }}>{title}</h2>
            <p style={{ color: "#6c675f", fontSize: 12, lineHeight: 1.55, margin: 0 }}>{text}</p>
          </div>
        ))}
      </section>

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
        <span>Tap any item for inclusions, rental duration, deposit details, and reservation options before checkout.</span>
      </section>
    </div>
  );
}
