"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Home, Menu, Store, ShoppingCart, Shield, Search, ShoppingBag, StoreIcon, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import BrandLockup from "@/components/BrandLockup";
import Footer from "@/components/Footer";
import { useStore } from "@/app/providers";
import { COMPANY } from "@/lib/company";
import CategoryNav from "./CategoryNav";
import ChatWidget from "@/components/ChatWidget";

const navItems: { href: string; label: string; icon: typeof Home }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/store", label: "Store", icon: Store },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/admin", label: "Admin", icon: Shield },
];

const primaryLinks: { href: string; label: string; external?: boolean }[] = [
  { href: "/store", label: "Store" },
  // BMR's branded storefront. (Curated "packages" were retired — gear rents by set.)
  { href: "/providers", label: "Rentals" },
  // Hidden for now (per client) — re-enable when the crew cross-link returns.
  // { href: "https://cineforce.vissionlink.com", label: "Need A Crew", external: true },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const PUBLIC_PROVIDERS = [{ name: COMPANY.legalName, queryOwner: "Vissionlink Rentals" }];

export default function SiteChrome({ children }: { children: ReactNode }) {
  const { cartCount } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const trimmed = query.trim();
    router.push(trimmed ? `/store?query=${encodeURIComponent(trimmed)}` : "/store");
  };


  // The admin area has its own dedicated chrome (sidebar + admin top bar) — skip
  // the public storefront header/footer entirely on /admin.
  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="app-container header-inner">
          <div className="header-main-row">
            <Link href="/" className="header-brand" aria-label="VissionLink home">
              <BrandMark size={24} />
              <BrandLockup size={18} />
            </Link>
            <nav className="primary-navbar desktop-primary-navbar" aria-label="Primary">
              {primaryLinks.map((item) => {
                const isProviders = item.href === "/providers";
                const active =
                  !item.external &&
                  (pathname === item.href ||
                    (item.href === "/store" && pathname.startsWith("/store")) ||
                    (item.href === "/providers" && pathname === "/providers") ||
                    (item.href === "/about" && pathname === "/about") ||
                    (item.href === "/contact" && pathname === "/contact"));
                return item.external ? (
                  <a key={item.label} href={item.href} className="nav-cta" target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ) : isProviders ? (
                  <div key={item.label} className="primary-nav-node">
                    <Link href={item.href as Route} className={`nav-cta ${active ? "nav-cta-active" : ""}`}>
                      {item.label}
                      <ChevronDown className="primary-nav-arrow" size={14} strokeWidth={1.8} />
                    </Link>
                    <div className="primary-dropdown">
                      {PUBLIC_PROVIDERS.map((provider) => (
                        <Link
                          key={provider.name}
                          href="/providers"
                          className={pathname === "/providers" ? "primary-dropdown-selected" : ""}
                        >
                          {provider.name}
                        </Link>
                      ))}
                      <Link href={"/providers#packages" as Route} className="primary-dropdown-all">All packages</Link>
                    </div>
                  </div>
                ) : (
                  <Link key={item.label} href={item.href as Route} className={`nav-cta ${active ? "nav-cta-active" : ""}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="header-actions">
              <Link href="/store" aria-label="Store" className={`header-icon-button ${pathname.startsWith("/store") ? "header-icon-active" : ""}`}>
                <StoreIcon size={22} strokeWidth={1.6} />
              </Link>
              <button
                aria-label="Open search"
                onClick={() => setSearchOpen((open) => !open)}
                className={`header-icon-button ${searchOpen ? "header-icon-active" : ""}`}
              >
                <Search size={22} strokeWidth={1.6} />
              </button>
              <Link href="/cart" aria-label="Cart" className={`header-icon-button header-cart-button ${pathname.startsWith("/cart") ? "header-icon-active" : ""}`}>
                <ShoppingBag size={22} strokeWidth={1.6} />
                {cartCount > 0 && (
                  <span className="header-cart-count">
                    {cartCount}
                  </span>
                )}
              </Link>
              <button
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="header-icon-button mobile-menu-button"
              >
                {mobileMenuOpen ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
              </button>
            </div>
          </div>

          <div className="desktop-category-row">
            <CategoryNav />
          </div>

          {mobileMenuOpen && (
            <div className="mobile-menu-panel">
              <nav className="mobile-primary-nav" aria-label="Mobile primary">
                {primaryLinks.map((item) => {
                  const isProviders = item.href === "/providers";
                  const active =
                    !item.external &&
                  (pathname === item.href ||
                      (item.href === "/store" && pathname.startsWith("/store")) ||
                      (item.href === "/providers" && pathname === "/providers") ||
                      (item.href === "/about" && pathname === "/about") ||
                      (item.href === "/contact" && pathname === "/contact"));
                  return item.external ? (
                    <a key={item.label} href={item.href} target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)}>
                      {item.label}
                    </a>
                  ) : isProviders ? (
                    <span key={item.label} className="mobile-nav-group">
                      <Link href={item.href as Route} className={active ? "mobile-nav-active" : ""} onClick={() => setMobileMenuOpen(false)}>
                        {item.label}
                      </Link>
                      <Link href={"/providers#packages" as Route} className="mobile-nav-sub" onClick={() => setMobileMenuOpen(false)}>
                        All packages
                      </Link>
                    </span>
                  ) : (
                    <Link key={item.label} href={item.href as Route} className={active ? "mobile-nav-active" : ""} onClick={() => setMobileMenuOpen(false)}>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mobile-menu-categories">
                <CategoryNav />
              </div>
            </div>
          )}
        </div>

        {searchOpen && (
          <div className="header-search-row">
            <div className="app-container header-filter-bar">
              <Search size={19} color="#6b7280" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitSearch();
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                placeholder="Search gear, category, or owner - e.g. camera, Aputure, drone"
              />
              <button className="filter-submit" onClick={submitSearch}>
                <Search size={18} strokeWidth={2.2} />
                Search
              </button>
              <button
                aria-label="Close search"
                className="filter-close"
                onClick={() => setSearchOpen(false)}
              >
                <X size={22} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating chat assistant — also runs the personalised "find gear" Q&A
          (purpose, gear, dates), replacing the old Find Gear button + form. */}
      <ChatWidget />

      <main className="mobile-pad">{children}</main>

      <Footer />

      <nav className="bottom-nav">
        <div className="app-container" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, padding: "10px 0 12px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href as Route} style={{ textDecoration: "none", color: active ? "#15130f" : "#6c675f", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <Icon size={24} />
                  <span style={{ fontSize: 12, fontFamily: '"Montserrat", sans-serif', fontWeight: 600 }}>{item.label}</span>
                  {item.href === "/cart" && cartCount > 0 && (
                    <span style={{ fontSize: 11, color: "#fffdf8", background: "#1f1f1f", borderRadius: 999, padding: "1px 6px" }}>
                      {cartCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
