"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, MapPin, Package, ShieldAlert } from "lucide-react";
import { useStore } from "@/app/providers";
import GearImagePlaceholder from "@/components/GearImagePlaceholder";
import { categoryName, normalizeCategory } from "@/lib/categories";

export default function GearDetailPage() {
  const params = useParams<{ slug: string }>();
  const { catalog } = useStore();

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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 20 }}>
            <Stat label="Stock" value={`${item.stock}`} />
            <Stat label="Pricing" value="Quoted by admin" />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link
              href="/providers"
              style={{
                border: "none",
                background: "#f5c518",
                color: "#15130f",
                fontWeight: 800,
                borderRadius: 999,
                padding: "11px 20px",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              <ArrowUpRight size={16} /> View Package
            </Link>
            <div style={{ padding: "10px 12px", borderRadius: 0, background: "#fff7e6", border: "1px solid rgba(180,120,0,0.22)", color: "#8a5b00", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <ShieldAlert size={15} /> Final rate reviewed before booking
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <InfoRow icon={MapPin} text={item.location} />
            <InfoRow icon={Package} text={`Managed by ${item.owner}`} />
            <InfoRow icon={CalendarDays} text="Rental schedule reviewed by admin" />
            <InfoRow icon={CheckCircle2} text="Available for quotation requests" />
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
