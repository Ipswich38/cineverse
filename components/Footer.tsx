import Link from "next/link";
import type { Route } from "next";
import BrandMark from "@/components/BrandMark";
import { COMPANY } from "@/lib/company";

type FooterLink = { href: string; label: string; external?: boolean };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Marketplace",
    links: [
      { href: "/store", label: "Browse Gear" },
      { href: "/contact", label: "List Your Gear" },
      // Hidden for now (per client) — re-enable when the crew cross-link returns.
      // { href: "https://cineforce.vissionlink.com", label: "Need A Crew", external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms & Conditions" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/refund", label: "Refund & Cancellation" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="app-container" style={{ padding: "48px 0 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 2fr)", gap: 36 }} className="footer-top">
          {/* Brand + disclosure */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BrandMark size={30} />
              <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: 20, letterSpacing: "-0.03em", color: "#fffdf8" }}>
                VissionLink
              </span>
            </div>
            <p style={{ margin: "14px 0 0", color: "rgba(255,253,248,0.6)", fontSize: 13, lineHeight: 1.6, maxWidth: 320 }}>
              {COMPANY.tagline}
            </p>
            <p style={{ margin: "16px 0 0", color: "rgba(255,253,248,0.5)", fontSize: 12, lineHeight: 1.6, maxWidth: 340 }}>
              {COMPANY.operatedByLine}, a BIR-registered business. {COMPANY.taxType} · TIN {COMPANY.tin}.
            </p>
          </div>

          {/* Link columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24 }}>
            {columns.map((col) => (
              <div key={col.title}>
                <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f5c518" }}>
                  {col.title}
                </p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.external ? (
                        <a href={l.href} target="_blank" rel="noreferrer" style={{ color: "rgba(255,253,248,0.72)", fontSize: 13, textDecoration: "none" }}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href as Route} style={{ color: "rgba(255,253,248,0.72)", fontSize: 13, textDecoration: "none" }}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,253,248,0.12)",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ margin: 0, color: "rgba(255,253,248,0.5)", fontSize: 12 }}>
            © {year} {COMPANY.legalName}. All rights reserved.
          </p>
          <a href={`mailto:${COMPANY.email}`} style={{ color: "rgba(255,253,248,0.72)", fontSize: 12, textDecoration: "none" }}>
            {COMPANY.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
