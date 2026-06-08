import type { Metadata } from "next";
import PackagesCatalog from "@/components/PackagesCatalog";

export const metadata: Metadata = {
  title: "Production Packages · VissionLink",
  description: "Reviewed camera, lighting, grip, and full-production rental packages from BMR Cinema Operation Services.",
};

// Public packages index. PackagesCatalog is client-side and reads the live,
// DB-backed packages from the store provider, so admin price edits show here.
export default function PackagesPage() {
  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <header style={{ marginBottom: 22 }}>
        <p style={{ margin: "0 0 6px", color: "#6c675f", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          BMR Cinema Operation Services
        </p>
        <h1 style={{ margin: 0, fontFamily: '"Jost", sans-serif', fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.98, fontWeight: 500 }}>
          Production packages
        </h1>
        <p style={{ color: "#6c675f", lineHeight: 1.7, margin: "12px 0 0", maxWidth: 720 }}>
          Reviewed bundles for camera, monitoring, lighting, grip, and full-production days. Rent a package outright,
          or request a quote for multi-day discounts and custom configurations.
        </p>
      </header>
      <PackagesCatalog />
    </div>
  );
}
