"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Filter, Home, Store, ShoppingCart, Shield, Search, ShoppingBag, StoreIcon, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import BrandLockup from "@/components/BrandLockup";
import Footer from "@/components/Footer";
import RentalCalendar from "@/components/RentalCalendar";
import { useStore } from "@/app/providers";
import { bookedDateSet, isItemAvailable } from "@/lib/catalog";
import CategoryNav from "./CategoryNav";

const navItems: { href: string; label: string; icon: typeof Home }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/store", label: "Store", icon: Store },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/admin", label: "Admin", icon: Shield },
];

const primaryLinks: { href: string; label: string; external?: boolean }[] = [
  { href: "/store", label: "Browse A Gear" },
  // Hidden for now (per client) — re-enable when the crew cross-link returns.
  // { href: "https://cineforce.vissionlink.com", label: "Need A Crew", external: true },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteChrome({ children }: { children: ReactNode }) {
  const { cartCount, catalog } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [gearBarOpen, setGearBarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const bookedDates = useMemo(() => bookedDateSet(catalog), [catalog]);
  const availableCount = useMemo(
    () => (dateFrom && dateTo ? catalog.filter((i) => isItemAvailable(i, dateFrom, dateTo)).length : null),
    [catalog, dateFrom, dateTo],
  );

  const dateLabel = useMemo(() => {
    const fmt = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
    if (dateFrom) return `From ${fmt(dateFrom)}`;
    return "Pickup & return dates";
  }, [dateFrom, dateTo]);

  const submitSearch = () => {
    const trimmed = query.trim();
    router.push(trimmed ? `/store?query=${encodeURIComponent(trimmed)}` : "/store");
  };

  const submitGearSearch = () => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("query", query.trim());
    if (location.trim()) p.set("location", location.trim());
    if (dateFrom) p.set("from", dateFrom);
    if (dateTo) p.set("to", dateTo);
    router.push((`/store${p.toString() ? `?${p}` : ""}`) as Route);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="app-container" style={{ padding: "14px 0 10px", position: "relative" }}>
          <div className="header-main-row">
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", justifySelf: "start" }}>
              <BrandMark size={24} />
              <BrandLockup size={18} />
            </Link>
            <nav className="primary-navbar" aria-label="Primary">
              {primaryLinks.map((item) => {
                const active =
                  !item.external &&
                  (pathname === item.href ||
                    (item.href === "/store" && pathname.startsWith("/store")) ||
                    (item.href === "/about" && pathname === "/about") ||
                    (item.href === "/contact" && pathname === "/contact"));
                return item.external ? (
                  <a key={item.label} href={item.href} className="nav-cta" target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} href={item.href as Route} className={`nav-cta ${active ? "nav-cta-active" : ""}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
              <Link href="/store" aria-label="Browse store" style={{ color: "#15130f", display: "inline-flex" }}>
                <StoreIcon size={22} strokeWidth={1.6} />
              </Link>
              <button
                aria-label="Open search"
                onClick={() => setSearchOpen((open) => !open)}
                style={{ background: "transparent", border: 0, color: "#15130f", padding: 0, display: "inline-flex", cursor: "pointer" }}
              >
                <Search size={22} strokeWidth={1.6} />
              </button>
              <Link href="/cart" aria-label="Cart" style={{ color: "#15130f", display: "inline-flex", position: "relative" }}>
                <ShoppingBag size={22} strokeWidth={1.6} />
                {cartCount > 0 && (
                  <span style={{ position: "absolute", right: -8, top: -8, fontSize: 11, color: "#fffdf8", background: "#1f1f1f", borderRadius: 999, padding: "1px 6px" }}>
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <CategoryNav />
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

      <button className="floating-filter-button" onClick={() => setGearBarOpen(true)}>
        <Filter size={16} strokeWidth={2.2} />
        Find Gear
      </button>

      {gearBarOpen && (
        <div className="floating-filter-panel" role="dialog" aria-label="Find rental gear">
          <div className="floating-filter-backdrop" onClick={() => setGearBarOpen(false)} />
          <form
            className="store-filter-bar floating-filter-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitGearSearch();
              setCalOpen(false);
              setGearBarOpen(false);
            }}
          >
            <button
              className="floating-filter-close"
              type="button"
              onClick={() => {
                setCalOpen(false);
                setGearBarOpen(false);
              }}
              aria-label="Close filter"
            >
              <X size={18} />
            </button>
            <label className="store-filter-field">
              <span>Item / Equipment</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Camera, lens, drone..." />
            </label>
            <label className="store-filter-field">
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Anywhere" />
            </label>
            <div className="store-filter-field" style={{ position: "relative" }}>
              <span>Duration of Rental</span>
              <button
                type="button"
                onClick={() => setCalOpen((open) => !open)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  color: dateFrom ? "#fffdf8" : "rgba(255,253,248,0.52)",
                  fontSize: 14,
                  textAlign: "left",
                }}
              >
                <CalendarDays size={15} />
                {dateLabel}
              </button>

              {calOpen && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 16px)",
                    left: 0,
                    zIndex: 80,
                    width: "min(340px, 86vw)",
                    background: "#fffdf8",
                    borderRadius: 18,
                    border: "1px solid rgba(17,17,17,0.1)",
                    boxShadow: "0 24px 60px rgba(17,17,17,0.28)",
                    padding: 18,
                  }}
                >
                  <RentalCalendar
                    from={dateFrom}
                    to={dateTo}
                    bookedDates={bookedDates}
                    onChange={(f, t) => {
                      setDateFrom(f);
                      setDateTo(t);
                    }}
                  />
                  {availableCount !== null && (
                    <p style={{ margin: "14px 0 0", fontSize: 12.5, fontWeight: 700, color: "#15130f" }}>
                      {availableCount} of {catalog.length} gear available for these dates
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setCalOpen(false)}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      background: "#15130f",
                      color: "#fffdf8",
                      border: 0,
                      borderRadius: 999,
                      padding: "11px 0",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
            <label className="store-filter-field">
              <span>Budget Optional</span>
              <input placeholder="Daily or total budget" />
            </label>
            <button className="store-filter-submit" type="submit">
              <Search size={16} strokeWidth={2.2} />
              Find A Gear
            </button>
          </form>
        </div>
      )}

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
