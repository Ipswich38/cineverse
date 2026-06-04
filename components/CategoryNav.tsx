"use client";

import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { useState } from "react";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/lib/categories";

const to = (slug: string) => `/store?category=${encodeURIComponent(slug)}` as Route;

// Top-level category bar with a hover mega-menu of subcategories. Driven entirely by
// the taxonomy in lib/categories.ts.
export default function CategoryNav() {
  const [open, setOpen] = useState<string | null>(null);
  const active = open ? CATEGORY_BY_SLUG.get(open) : null;

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setOpen(null)}>
      <nav className="desktop-category-nav" aria-label="Product categories" style={{ flexWrap: "wrap", overflow: "visible" }}>
        <Link href="/store">All Rentals</Link>
        {CATEGORIES.map((top) => (
          <Link
            key={top.slug}
            href={to(top.slug)}
            onMouseEnter={() => setOpen(top.slug)}
            onFocus={() => setOpen(top.slug)}
            aria-haspopup={top.children.length > 0}
            style={open === top.slug ? { color: "#15130f", fontWeight: 800 } : undefined}
          >
            {top.name}
          </Link>
        ))}
      </nav>

      {active && active.children.length > 0 && (
        <div style={panel} onMouseEnter={() => setOpen(active.slug)}>
          {active.children.map((sub) => (
            <div key={sub.slug} style={{ minWidth: 168 }}>
              <Link href={to(sub.slug)} style={subHead}>{sub.name}</Link>
              {sub.children.map((leaf) => (
                <Link key={leaf.slug} href={to(leaf.slug)} style={leafLink}>
                  {leaf.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panel: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 50,
  display: "flex",
  flexWrap: "wrap",
  gap: 20,
  background: "#fffdf8",
  border: "1px solid rgba(17,17,17,0.12)",
  borderRadius: 14,
  boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
  padding: 18,
  marginTop: 6,
  maxHeight: 460,
  overflowY: "auto",
};

const subHead: CSSProperties = {
  display: "block",
  fontWeight: 800,
  fontSize: 13,
  color: "#15130f",
  textDecoration: "none",
  padding: "4px 0",
  marginBottom: 2,
};

const leafLink: CSSProperties = {
  display: "block",
  fontSize: 12.5,
  color: "#6c675f",
  textDecoration: "none",
  padding: "3px 0",
};
