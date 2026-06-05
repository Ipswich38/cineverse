"use client";

import ProviderStorefront from "@/components/ProviderStorefront";
import { BMR_PROVIDER } from "@/lib/providers";

// VissionLink's flagship store. BMR renders through the shared, data-driven
// ProviderStorefront — the same path a future /providers/[slug] will use, so new
// providers each get their own branded store with near-zero extra work.
export default function ProvidersPage() {
  return (
    <div className="app-container" style={{ padding: "0 0 0" }}>
      <ProviderStorefront profile={BMR_PROVIDER} />
    </div>
  );
}
