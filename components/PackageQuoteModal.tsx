"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Send, ShoppingCart } from "lucide-react";
import type { PackageOffer } from "@/lib/package-offers";
import { useStore } from "@/app/providers";

// "Ask a quotation" deep-links to the Quotation tab of /contact with this package
// (and BMR as the provider) preselected — a single quote form for the whole site,
// instead of a per-card inline modal. Kept in this file so existing imports of
// { PackageQuoteButton } from "@/components/PackageQuoteModal" keep working.
export function PackageQuoteButton({
  offer,
  className = "quote-button",
  children = "Ask a quotation",
}: {
  offer: PackageOffer;
  className?: string;
  children?: ReactNode;
}) {
  const href = `/contact?type=quote&package=${encodeURIComponent(offer.slug)}&provider=bmr` as Route;
  return (
    <Link href={href} className={className}>
      <Send size={15} /> {children}
    </Link>
  );
}

// Instant-rent a package as a single fixed-rate cart line, then go to the cart.
// Uses the lead related item's image as the package thumbnail.
export function PackageRentButton({
  offer,
  className = "quote-button",
  children = "Rent now",
}: {
  offer: PackageOffer;
  className?: string;
  children?: ReactNode;
}) {
  const { addPackageToCart, catalog } = useStore();
  const router = useRouter();
  const rent = () => {
    const img = catalog.find((c) => offer.relatedItemSlugs.includes(c.slug))?.images?.[0] ?? catalog[0]?.images?.[0] ?? "";
    addPackageToCart(offer, 1, img, 1);
    router.push("/cart");
  };
  return (
    <button onClick={rent} className={className} style={{ border: "none", cursor: "pointer" }}>
      <ShoppingCart size={15} /> {children}
    </button>
  );
}
