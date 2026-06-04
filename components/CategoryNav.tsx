import Link from "next/link";
import type { Route } from "next";
import { CATEGORIES, type SluggedCategory } from "@/lib/categories";

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
        <Link className="cat-toplink cat-toplink--all" href="/store">All Rentals</Link>
        {CATEGORIES.map((top) => (
          <div className="cat-node cat-top" key={top.slug}>
            <Link className="cat-toplink" href={to(top.slug)}>{top.name}</Link>
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
.cat-bar { display:flex; flex-wrap:wrap; align-items:center; position:relative; row-gap:0; }
.cat-top { position:relative; }
.cat-toplink { display:inline-flex; align-items:center; padding:11px 14px; font-size:12.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#15130f; text-decoration:none; white-space:nowrap; }
.cat-toplink--all { color:#6c675f; }
.cat-top:hover > .cat-toplink { color:#9a7100; }

.cat-col { display:none; position:absolute; z-index:60; min-width:250px; background:#33323b; box-shadow:0 20px 44px rgba(0,0,0,.30); padding:6px 0; }
.cat-col--root { top:100%; left:0; }
.cat-col--sub { top:0; left:100%; }
.cat-top:hover > .cat-col--root { display:block; }
.cat-node { position:relative; }
.cat-node:hover > .cat-col--sub { display:block; }

.cat-col .cat-link { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:13px 18px; color:#e7e4de; text-decoration:none; font-size:14.5px; font-weight:600; white-space:nowrap; }
.cat-node:hover > .cat-link { background:#e9e5d6; color:#15130f; }
.cat-arrow { font-size:10px; opacity:.85; margin-left:auto; }

@media (max-width:860px) {
  .cat-bar { flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden; }
  .cat-col { display:none !important; } /* touch devices: top links navigate; no hover flyout */
}
`;
