"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, MapPin, Minus, Package, Plus, ShieldCheck, ShoppingCart } from "lucide-react";
import { useStore } from "@/app/providers";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import { categoryName, normalizeCategory } from "@/lib/categories";
import { peso, DOWNPAYMENT_RATE } from "@/lib/rental-pricing";

export default function GearDetailPage() {
  const params = useParams<{ slug: string }>();
  const { catalog, addToCart } = useStore();
  const router = useRouter();
  const [days, setDays] = useState(1);

  const item = useMemo(() => catalog.find((entry) => entry.slug === params.slug), [catalog, params.slug]);

  if (!item) {
    return (
      <div className="app-container" style={{ padding: "32px 0 76px" }}>
        <p>Item not found.</p>
        <Link href="/store">Back to store</Link>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: "20px 0 64px" }}>
      <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#15130f", textDecoration: "none", marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to store
      </Link>

      <div style={{ overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: 28 }}>
        <div style={{ minHeight: 420, background: "#ece6dc" }}>
          <GearImagePlaceholder name={item.name} minHeight={420} />
        </div>
        <div style={{ padding: "4px 0 24px" }}>
          <p style={{ color: "#9a7100", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, fontWeight: 700, marginTop: 0 }}>{categoryName(normalizeCategory(item.category))}</p>
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 0.98, letterSpacing: "-0.045em", margin: "6px 0 10px" }}>{item.name}</h1>
          <p style={{ color: "#6c675f", fontSize: 14, lineHeight: 1.6 }}>{item.description}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 20 }}>
            <Stat label="Daily rate" value={`${peso(item.ratePerDay)}/day`} />
            <Stat label="To reserve" value={`${Math.round(DOWNPAYMENT_RATE * 100)}% down`} />
            <Stat label="Stock" value={`${item.stock}`} />
          </div>

          {/* Rent now: pick days → add to cart → cart. Quotation path kept alongside. */}
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 5 }}>
                <span style={{ color: "#6c675f", fontSize: 12, fontWeight: 700 }}>Rental days</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 999, padding: "6px 12px" }}>
                  <button aria-label="Fewer days" onClick={() => setDays((d) => Math.max(1, d - 1))} style={{ background: "none", border: "none", color: "#15130f", cursor: "pointer" }}><Minus size={15} /></button>
                  <span style={{ minWidth: 24, textAlign: "center", fontWeight: 800 }}>{days}</span>
                  <button aria-label="More days" onClick={() => setDays((d) => d + 1)} style={{ background: "none", border: "none", color: "#15130f", cursor: "pointer" }}><Plus size={15} /></button>
                </div>
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ color: "#6c675f", fontSize: 12, fontWeight: 700 }}>Rental subtotal</span>
                <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 800, fontSize: 22 }}>{peso(item.ratePerDay * days)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => { addToCart(item, days, 1); router.push("/cart"); }}
                disabled={item.stock <= 0}
                style={{ border: "none", background: item.stock > 0 ? "#f5c518" : "#e3ddd2", color: "#15130f", fontWeight: 800, borderRadius: 999, padding: "12px 22px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8, cursor: item.stock > 0 ? "pointer" : "not-allowed" }}
              >
                <ShoppingCart size={16} /> {item.stock > 0 ? "Rent now" : "Out of stock"}
              </button>
              <Link href={{ pathname: "/contact", query: { type: "quote" } }} style={{ background: "transparent", color: "#15130f", fontWeight: 700, borderRadius: 999, padding: "12px 20px", fontSize: 13, border: "1px solid rgba(17,17,17,0.2)", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <FileText size={15} /> Request a quotation
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <InfoRow icon={MapPin} text={item.location} />
            <InfoRow icon={Package} text={`Managed by ${item.owner}`} />
            <InfoRow icon={ShieldCheck} text={`Pay just ${Math.round(DOWNPAYMENT_RATE * 100)}% online to reserve — the balance is settled before or upon handover.`} />
            <InfoRow icon={CalendarDays} text="Pickup / delivery arranged after payment." />
            <InfoRow icon={CheckCircle2} text="Invoice + lease contract emailed instantly." />
          </div>

          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 18, margin: "0 0 8px" }}>Included</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: "#6c675f", lineHeight: 1.8 }}>
              {item.specs.map((spec) => <li key={spec}>{spec}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, border: "1px solid rgba(17,17,17,0.12)", background: "#fffdf8" }}>
      <div style={{ color: "#6c675f", fontSize: 12 }}>{label}</div>
      <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: 16, marginTop: 5 }}>{value}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, text }: { icon: ComponentType<{ size?: number; color?: string }>; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6c675f" }}>
      <Icon size={15} color="#9a7100" />
      <span>{text}</span>
    </div>
  );
}
