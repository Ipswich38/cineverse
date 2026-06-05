"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { useStore } from "../providers";
import { isItemAvailable } from "@/lib/catalog";
import { categoryName, descendantSlugs, normalizeCategory } from "@/lib/categories";
import EquipmentCard from "@/components/EquipmentCard";
import FeaturedProvider from "@/components/FeaturedProvider";

export default function StorePage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "28px 0 76px" }}>Loading catalog...</div>}>
      <StoreContent />
    </Suspense>
  );
}

function StoreContent() {
  const { catalog } = useStore();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const category = searchParams.get("category") ?? "";
  const location = searchParams.get("location") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Selecting a category includes everything beneath it (e.g. "Cameras" shows
  // "Cinema Cameras", "Camera Accessories › Batteries", etc.).
  const allowedCategories = useMemo(() => (category ? descendantSlugs(normalizeCategory(category)) : null), [category]);

  const filtered = useMemo(() => {
    return catalog.filter((item) => {
      if (query && !`${item.name} ${item.description} ${item.owner} ${item.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (allowedCategories && !allowedCategories.has(normalizeCategory(item.category))) return false;
      if (location && !item.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (!isItemAvailable(item, from, to)) return false;
      return true;
    });
  }, [catalog, query, allowedCategories, location, from, to]);

  const dateNote =
    from && to
      ? `${new Date(from + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${new Date(
          to + "T00:00:00",
        ).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`
      : null;

  return (
    <div className="app-container" style={{ padding: "24px 0 76px" }}>
      <div style={{ marginBottom: 26 }}>
        <FeaturedProvider />
      </div>

      <div style={{ margin: "0 0 18px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", color: "#6c675f", fontSize: 13 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <SlidersHorizontal size={14} /> {filtered.length} results{category ? ` in ${categoryName(normalizeCategory(category))}` : ""}
        </span>
        {dateNote && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f0ece3",
              borderRadius: 999,
              padding: "5px 12px",
              fontWeight: 700,
              color: "#15130f",
            }}
          >
            <CalendarDays size={13} /> Available {dateNote}
          </span>
        )}
      </div>

      <div className="product-grid">
        {filtered.map((item) => <EquipmentCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
