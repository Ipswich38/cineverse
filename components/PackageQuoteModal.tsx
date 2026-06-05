"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { Send } from "lucide-react";
import type { PackageOffer } from "@/lib/package-offers";

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
