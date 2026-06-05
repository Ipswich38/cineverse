import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function CheckoutPage() {
  return (
    <div className="app-container" style={{ padding: "34px 0 76px", maxWidth: 820 }}>
      <p className="section-kicker">Quotation first</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1, fontWeight: 500, margin: "8px 0 12px" }}>
        Checkout is now handled after admin review
      </h1>
      <p style={{ color: "#6c675f", lineHeight: 1.7, maxWidth: 680 }}>
        VissionLink is moving rentals to a quotation-first workflow. Package and item pricing is reviewed by admin before confirmation, so customers are not shown per-item checkout totals before availability, scope, transport, crew, and taxes are checked.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 22 }}>
        <Step title="1. Request quotation" text="Choose a package or describe your rental needs." />
        <Step title="2. Admin reviews" text="The team checks availability, scope, dates, and safe rates." />
        <Step title="3. Confirm booking" text="Final pricing and payment instructions are sent after review." />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
        <Link href="/packages" className="primary-button">
          Ask a quotation <ArrowRight size={16} />
        </Link>
        <Link href="/store" className="secondary-button">
          Browse gear
        </Link>
      </div>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
        {title.startsWith("1") ? <CheckCircle2 size={16} color="#9a7100" /> : <ShieldCheck size={16} color="#9a7100" />}
        {title}
      </div>
      <p style={{ color: "#6c675f", fontSize: 13, lineHeight: 1.55, margin: "8px 0 0" }}>{text}</p>
    </div>
  );
}
