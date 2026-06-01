"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, Package, ShoppingCart, ShieldAlert } from "lucide-react";
import { useStore } from "@/app/providers";
import { currency } from "@/lib/catalog";

export default function GearDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { catalog, addToCart } = useStore();
  const [days, setDays] = useState(3);
  const [qty, setQty] = useState(1);

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
          <img src={item.images[0]} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ padding: "4px 0 24px" }}>
          <p style={{ color: "#9a7100", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, fontWeight: 700, marginTop: 0 }}>{item.category}</p>
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 0.98, letterSpacing: "-0.045em", margin: "6px 0 10px" }}>{item.name}</h1>
          <p style={{ color: "#6c675f", fontSize: 14, lineHeight: 1.6 }}>{item.description}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 20 }}>
            <Stat label="Daily rate" value={currency(item.ratePerDay)} />
            <Stat label="Deposit" value={currency(item.securityDeposit)} />
            <Stat label="Stock" value={`${item.stock}`} />
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            <Control label="Rental days" value={days} setValue={setDays} min={1} max={30} />
            <Control label="Quantity" value={qty} setValue={setQty} min={1} max={item.stock} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                addToCart(item, days, qty);
                router.push("/cart");
              }}
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
              }}
            >
              <ShoppingCart size={16} /> Add to cart
            </button>
            <div style={{ padding: "10px 12px", borderRadius: 0, background: "#fff7e6", border: "1px solid rgba(180,120,0,0.22)", color: "#8a5b00", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <ShieldAlert size={15} /> Downpayment reserved on checkout
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
            <InfoRow icon={MapPin} text={item.location} />
            <InfoRow icon={Package} text={`Managed by ${item.owner}`} />
            <InfoRow icon={CalendarDays} text={`${days} day rental selected`} />
            <InfoRow icon={CheckCircle2} text="Available for booking requests" />
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

function Control({
  label,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label style={{ padding: 12, border: "1px solid rgba(17,17,17,0.12)", background: "#fffdf8", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ color: "#6c675f", fontSize: 12 }}>{label}</span>
        <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 700 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} />
    </label>
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
