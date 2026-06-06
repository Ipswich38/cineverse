import Link from "next/link";
import { ArrowRight, CreditCard, FileCheck2, PackageCheck, Tags } from "lucide-react";

// "Why BMR" — an honest comparison against the *traditional* rental experience
// (no named competitors). It leans on what BMR has actually built end-to-end:
// rent → pay → invoice + lease → set-based gear. Some shops have catalogs online;
// the edge is doing the whole transaction (book, pay, get your contract) in one go.

const ROWS: { label: string; others: string; bmr: string }[] = [
  { label: "Booking", others: "By inquiry, within office hours", bmr: "Book online anytime — even after hours" },
  { label: "Pricing", others: "Quoted per booking", bmr: "Clear, published per-set rates" },
  { label: "Payment", others: "Bank transfer or cash", bmr: "GCash, Maya, GrabPay & cards (incl. GoTyme) — via PayMongo" },
  { label: "Paperwork", others: "Arranged manually", bmr: "Invoice & rental contract emailed to you" },
  { label: "Gear", others: "Itemised à la carte", bmr: "Complete sets — checked & ready" },
  { label: "Availability", others: "Confirmed on request", bmr: "Real-time availability online" },
  { label: "To book", others: "Pay up front", bmr: "Just 15% down to reserve — balance later" },
];

const STRENGTHS = [
  { icon: CreditCard, title: "Book & pay online", body: "Reserve your dates and pay online — card, GCash, Maya or GrabPay, securely via PayMongo. No back-and-forth, no waiting for office hours." },
  { icon: FileCheck2, title: "Invoice & contract in your inbox", body: "Once payment clears, your official invoice and rental contract are emailed to you automatically." },
  { icon: PackageCheck, title: "Complete sets, nothing missing", body: "Gear rents as a full set or kit with every accessory listed — what you see is exactly what arrives, checked and ready." },
  { icon: Tags, title: "Low downpayment to book", body: "Published per-set rates — reserve with just 15% online, settle the balance before or upon handover. Planning a longer shoot? Request a discount quote." },
];

export default function WhyBmr() {
  return (
    <section style={{ marginTop: 40 }} aria-label="Why rent from BMR">
      <div style={{ marginBottom: 18 }}>
        <p className="section-kicker">Why BMR</p>
        <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, letterSpacing: "-0.04em", margin: "6px 0 6px" }}>
          Built for how productions actually work
        </h2>
        <p style={{ color: "#6c675f", maxWidth: 680, lineHeight: 1.6, margin: 0, fontSize: 14 }}>
          BMR Cinema Operation Services is one of Metro Manila&apos;s trusted camera and production-gear
          rental providers — paired with a rental experience that respects your time:
          <strong> book, pay, and receive your invoice and lease</strong> in one place.
        </p>
      </div>

      {/* Comparison */}
      <div style={{ border: "1px solid rgba(17,17,17,0.12)", borderRadius: 14, overflow: "hidden", background: "#fffdf8" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", background: "#15130f", color: "#fffdf8", fontWeight: 800, fontSize: 13 }}>
          <span style={{ padding: "11px 14px" }} />
          <span style={{ padding: "11px 14px", color: "#bcb7ad", fontWeight: 600 }}>The usual way</span>
          <span style={{ padding: "11px 14px", color: "#ffcc00", display: "inline-flex", alignItems: "center", gap: 6 }}><PackageCheck size={15} /> With BMR</span>
        </div>
        {ROWS.map((r, i) => (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", fontSize: 13.5, background: i % 2 ? "#f7f5ef" : "#fffdf8" }}>
            <span style={{ padding: "11px 14px", fontWeight: 800, color: "#15130f" }}>{r.label}</span>
            <span style={{ padding: "11px 14px", color: "#8a857c" }}>{r.others}</span>
            <span style={{ padding: "11px 14px", color: "#15130f", fontWeight: 600, borderLeft: "2px solid #f5c518" }}>{r.bmr}</span>
          </div>
        ))}
      </div>

      {/* Strengths */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
        {STRENGTHS.map(({ icon: Icon, title, body }) => (
          <div key={title} style={{ border: "1px solid rgba(17,17,17,0.12)", borderRadius: 12, padding: 16, background: "#fffdf8" }}>
            <span style={{ display: "inline-flex", width: 38, height: 38, borderRadius: 10, background: "rgba(245,197,24,0.2)", color: "#9a7100", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Icon size={19} />
            </span>
            <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 16, margin: "0 0 5px" }}>{title}</h3>
            <p style={{ color: "#6c675f", fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{body}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5c518", color: "#15130f", fontWeight: 800, borderRadius: 999, padding: "12px 22px", fontSize: 14, textDecoration: "none" }}>
          Browse the sets <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
