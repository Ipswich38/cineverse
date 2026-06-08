"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, EquipmentItem } from "@/lib/catalog";
import { INITIAL_CATALOG } from "@/lib/catalog";
import type { PackageOffer } from "@/lib/package-offers";
import { PACKAGE_OFFERS } from "@/lib/package-offers";
import { rentalTotals } from "@/lib/rental-pricing";

type StoreContextValue = {
  catalog: EquipmentItem[];
  catalogLoading: boolean;
  refreshCatalog: () => Promise<void>;
  packages: PackageOffer[];
  packagesLoading: boolean;
  refreshPackages: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: EquipmentItem, days: number, quantity?: number) => void;
  addPackageToCart: (offer: PackageOffer, days: number, image: string, quantity?: number) => void;
  setDays: (itemId: string, days: number) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  /** Downpayment charged online now (DOWNPAYMENT_RATE × rental). */
  downpaymentTotal: number;
  /** Balance settled later (before/upon handover). */
  balanceTotal: number;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_KEY = "vissionlink.cart";

export function StoreProvider({ children }: { children: ReactNode }) {
  // Catalog is sourced from the cached /api/catalog feed (DB-backed). It starts
  // from the bundled seed so the first paint is instant, then hydrates from the
  // server. If the API/DB is unavailable, the seed remains as a graceful fallback.
  const [catalog, setCatalog] = useState<EquipmentItem[]>(INITIAL_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);
  // Packages mirror the catalog: bundled seed for instant first paint, then the
  // DB-backed /api/packages feed hydrates them so admin price edits show through.
  const [packages, setPackages] = useState<PackageOffer[]>(PACKAGE_OFFERS);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as EquipmentItem[];
      if (Array.isArray(data) && data.length > 0) setCatalog(data);
    } catch {
      // keep current catalog (seed or last good) on network error
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const refreshPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/packages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PackageOffer[];
      if (Array.isArray(data) && data.length > 0) setPackages(data);
    } catch {
      // keep current packages (seed or last good) on network error
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  // Load cart from localStorage; fetch catalog from the cached API.
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_KEY);
      if (storedCart) setCart(JSON.parse(storedCart));
    } catch {
      // ignore corrupted storage
    } finally {
      setReady(true);
    }
    void refreshCatalog();
    void refreshPackages();
  }, [refreshCatalog, refreshPackages]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  const addToCart = (item: EquipmentItem, days: number, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.itemId === item.id && entry.days === days);
      if (existing) {
        return prev.map((entry) =>
          entry.itemId === item.id && entry.days === days
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry,
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          slug: item.slug,
          name: item.name,
          image: item.images[0],
          ratePerDay: item.ratePerDay,
          days,
          quantity,
          owner: item.owner,
        },
      ];
    });
  };

  // A package rents as a single fixed-rate cart line (id `pkg-<offer.id>`); the
  // server resolves the price from PACKAGE_OFFERS at checkout.
  const addPackageToCart = (offer: PackageOffer, days: number, image: string, quantity = 1) => {
    const itemId = `pkg-${offer.id}`;
    setCart((prev) => {
      const existing = prev.find((e) => e.itemId === itemId && e.days === days);
      if (existing) return prev.map((e) => (e.itemId === itemId && e.days === days ? { ...e, quantity: e.quantity + quantity } : e));
      return [...prev, { itemId, slug: offer.slug, name: offer.name, image, ratePerDay: offer.pricePerDay, days, quantity, owner: "BMR Cinema Operation Services" }];
    });
  };

  const setDays = (itemId: string, days: number) => {
    setCart((prev) => prev.map((entry) => (entry.itemId === itemId ? { ...entry, days } : entry)));
  };

  const setQuantity = (itemId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((entry) => (entry.itemId === itemId ? { ...entry, quantity } : entry))
        .filter((entry) => entry.quantity > 0),
    );
  };

  const removeFromCart = (itemId: string) => setCart((prev) => prev.filter((entry) => entry.itemId !== itemId));
  const clearCart = () => setCart([]);

  const totals = useMemo(
    () => rentalTotals(cart.map((item) => ({ ratePerDay: item.ratePerDay, days: item.days, quantity: item.quantity }))),
    [cart],
  );

  const subtotal = totals.rental;
  const downpaymentTotal = totals.downpayment;
  const balanceTotal = totals.balance;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value: StoreContextValue = {
    catalog,
    catalogLoading,
    refreshCatalog,
    packages,
    packagesLoading,
    refreshPackages,
    cart,
    addToCart,
    addPackageToCart,
    setDays,
    setQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    subtotal,
    downpaymentTotal,
    balanceTotal,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
