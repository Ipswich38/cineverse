"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Package, ShoppingCart } from "lucide-react";
import { useStore } from "@/app/providers";
import type { EquipmentItem } from "@/lib/catalog";
import { currency } from "@/lib/catalog";

export default function EquipmentCard({ item }: { item: EquipmentItem }) {
  const { addToCart } = useStore();

  return (
    <article className="equipment-card">
      <Link href={`/gear/${item.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", background: "#ece6dc" }}>
          <img
            src={item.images[0]}
            alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        </div>

        <div style={{ padding: "9px 0 0" }}>
          <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 16, lineHeight: 1.08, letterSpacing: "-0.025em", margin: 0, color: "#15130f" }}>
            {item.name}
          </h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
            <span style={{ color: "#6c675f", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {item.category}
            </span>
            {item.featured && (
              <span style={{ color: "#9a7100", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Featured
              </span>
            )}
          </div>
          <p style={{ color: "#6c675f", fontSize: 11, lineHeight: 1.4, marginTop: 5, minHeight: 30 }}>
            {item.description}
          </p>
        </div>
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "4px 0 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6c675f", fontSize: 11 }}>
          <MapPin size={12} />
          {item.location}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6c675f", fontSize: 11 }}>
          <Package size={12} />
          {item.stock} in stock
        </div>
      </div>

      <div style={{ padding: 0, display: "grid", gap: 10 }}>
        <div>
          <p style={{ fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: 16, margin: 0, color: "#15130f" }}>
            {currency(item.ratePerDay)}
          </p>
          <p style={{ color: "#6c675f", fontSize: 11, margin: "1px 0 0" }}>
            per day
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="card-pill-cta primary" onClick={() => addToCart(item, 1, 1)}>
            <ShoppingCart size={13} />
            Add to cart
          </button>
          <Link href={`/gear/${item.slug}`} className="card-pill-cta secondary">
            Details
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}
