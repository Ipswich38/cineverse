import Link from "next/link";
import type { Route } from "next";
import { ChevronDown } from "lucide-react";
import { CATEGORIES, type SluggedCategory } from "@/lib/categories";
import { COMPANY } from "@/lib/company";

const to = (slug: string) => `/store?category=${encodeURIComponent(slug)}` as Route;

// Renders the children of a column node: each item links to its category and, if it
// has children, shows a ▶ and a flyout column to its right (revealed on hover via CSS).
function Nodes({ nodes }: { nodes: SluggedCategory[] }) {
  return (
    <>
      {nodes.map((n) => (
        <div className="cat-node" key={n.slug}>
          <Link className="cat-link" href={to(n.slug)}>
            <span>{n.name}</span>
            {n.children.length > 0 && <span className="cat-arrow">▶</span>}
          </Link>
          {n.children.length > 0 && (
            <div className="cat-col cat-col--sub">
              <Nodes nodes={n.children} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

// Top category bar with a cascading, vertical flyout mega-menu (CSS-hover driven).
export default function CategoryNav() {
  return (
    <>
      <style>{CSS}</style>
      <nav className="cat-bar" aria-label="Product categories">
        <div className="cat-node cat-top">
          <Link className="cat-toplink cat-toplink--all" href="/store">
            All Rentals
            <ChevronDown className="cat-top-arrow" size={13} strokeWidth={1.8} />
          </Link>
          <div className="cat-col cat-col--root cat-col--all">
            <div className="cat-menu-label">Shop by Category:</div>
            <div className="cat-node">
              <Link className="cat-link" href="/providers">
                <span>Providers</span>
                <span className="cat-arrow">▶</span>
              </Link>
              <div className="cat-col cat-col--sub">
                <Link className="cat-link" href={`/store?query=${encodeURIComponent("Vissionlink Rentals")}` as Route}>
                  <span>{COMPANY.legalName}</span>
                </Link>
                <Link className="cat-link" href="/providers">
                  <span>View all providers</span>
                </Link>
              </div>
            </div>
            <Link className="cat-link" href={"/providers#packages" as Route}>Packages</Link>
            <Nodes nodes={CATEGORIES.filter((top) => top.slug !== "packages")} />
          </div>
        </div>
        {CATEGORIES.filter((top) => top.slug !== "packages").map((top) => (
          <div className="cat-node cat-top" key={top.slug}>
            <Link className="cat-toplink" href={to(top.slug)}>
              {top.name}
              {top.children.length > 0 && <ChevronDown className="cat-top-arrow" size={13} strokeWidth={1.8} />}
            </Link>
            {top.children.length > 0 && (
              <div className="cat-col cat-col--root">
                <Nodes nodes={top.children} />
              </div>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}

const CSS = `
/* Full-bleed: the black category strip spans the full viewport width while its
   links stay aligned to the centered container. Negative side margins pull the
   wrapper out to the viewport edges; equal padding pushes the content back in. */
.desktop-category-row { background:#11100e; margin-top:9px; margin-left:calc(50% - 50vw / var(--ui-scale)); margin-right:calc(50% - 50vw / var(--ui-scale)); padding-left:calc(50vw / var(--ui-scale) - 50%); padding-right:calc(50vw / var(--ui-scale) - 50%); }
.desktop-category-row .cat-bar { background:transparent; border:0; box-shadow:none; margin-top:0; }

.cat-bar { display:flex; flex-wrap:wrap; align-items:center; position:relative; row-gap:0; margin-top:9px; background:#11100e; border:1px solid rgba(255,255,255,.12); box-shadow:0 10px 24px rgba(17,17,17,.18); }
.cat-top { position:relative; }
.cat-toplink { display:inline-flex; align-items:center; padding:9px 11px; font-size:11px; font-weight:400; letter-spacing:0; text-transform:none; color:#fffdf8; text-decoration:none; white-space:nowrap; }
.cat-toplink--all { color:#fffdf8; }
.cat-top-arrow { opacity:.78; margin-left:4px; color:#f5c518; }
.cat-top:hover > .cat-toplink,
.cat-toplink:hover { color:#15130f; background:#f5c518; }
.cat-bar > .cat-top,
.cat-bar > .cat-toplink--all { border-right:1px solid rgba(255,255,255,.16); }
.cat-bar > .cat-top:last-child { border-right:0; }

.cat-col { display:none; position:absolute; z-index:60; min-width:250px; background:#11100e; border:1px solid rgba(255,255,255,.10); box-shadow:0 22px 48px rgba(0,0,0,.34); padding:6px 0; }
.cat-col--all { min-width:270px; }
.cat-col--root { top:100%; left:0; }
.cat-col--sub { top:0; left:100%; }
.cat-top:hover > .cat-col--root { display:block; }
.cat-node { position:relative; }
.cat-node:hover > .cat-col--sub { display:block; }

.cat-col .cat-link { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 16px; color:#fffdf8; text-decoration:none; font-size:13px; font-weight:400; white-space:nowrap; }
.cat-node:hover > .cat-link { background:#f5c518; color:#15130f; }
.cat-arrow { font-size:10px; opacity:.92; margin-left:auto; color:inherit; }
.cat-menu-label { padding:9px 16px 7px; color:#f5c518; font-size:11px; font-weight:500; border-bottom:1px solid rgba(255,255,255,.08); }

@media (max-width:860px) {
  .cat-bar { flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden; margin-top:8px; scrollbar-width:none; }
  .cat-bar::-webkit-scrollbar { display:none; }
  .cat-bar > .cat-top,
  .cat-bar > .cat-toplink--all { border-right:0; }
  .cat-menu-label { display:none; }
  .cat-col { display:none !important; } /* touch devices: top links navigate; no hover flyout */

  .mobile-menu-categories .cat-col {
    display:block !important;
    position:static;
    min-width:0;
    width:100%;
    box-shadow:none;
    padding:0;
    background:#11100e;
    border:0;
  }
  .mobile-menu-categories .cat-col--sub {
    margin-left:12px;
    border-left:1px solid rgba(255,255,255,.14);
  }
  .mobile-menu-categories .cat-col .cat-link {
    color:#fffdf8;
    background:transparent;
    padding:10px 12px;
    font-size:12.5px;
    white-space:normal;
  }
  .mobile-menu-categories .cat-node:hover > .cat-link {
    background:#f5c518;
    color:#15130f;
  }
  .mobile-menu-categories .cat-arrow {
    display:none;
  }
}
`;
