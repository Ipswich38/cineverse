import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";

const LEGAL_NAV: { slug: string; href: Route; label: string }[] = [
  { slug: "terms", href: "/legal/terms" as Route, label: "Terms & Conditions" },
  { slug: "privacy", href: "/legal/privacy" as Route, label: "Privacy Policy" },
  { slug: "refund", href: "/legal/refund" as Route, label: "Refund & Cancellation" },
];

export default function LegalShell({
  title,
  updated,
  active,
  children,
}: {
  title: string;
  updated: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="app-container" style={{ padding: "28px 0 76px", maxWidth: 860 }}>
      <p className="section-kicker">Legal</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(1.9rem, 4vw, 2.6rem)", letterSpacing: "-0.03em", margin: "8px 0 6px" }}>
        {title}
      </h1>
      <p style={{ margin: 0, color: "#6c675f", fontSize: 13 }}>Last updated: {updated}</p>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 28px" }}>
        {LEGAL_NAV.map((item) => {
          const isActive = item.slug === active;
          return (
            <Link
              key={item.slug}
              href={item.href}
              style={{
                textDecoration: "none",
                borderRadius: 999,
                padding: "8px 15px",
                fontSize: 12.5,
                fontWeight: 700,
                border: "1px solid rgba(17,17,17,0.12)",
                background: isActive ? "#15130f" : "transparent",
                color: isActive ? "#fffdf8" : "#15130f",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="legal-prose">{children}</div>
    </div>
  );
}
