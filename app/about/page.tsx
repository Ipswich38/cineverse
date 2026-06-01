import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, MessageSquare, ShieldCheck, UserCog, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "About — VissionLink",
  description: "How VissionLink helps film, TV, and production teams reserve gear from vetted owners across the Philippines.",
};

const RENTAL_FLOW = [
  { label: "Reserved", description: "30% downpayment confirmed by PayMongo." },
  { label: "Owner notified", description: "The gear owner gets your booking and contact details." },
  { label: "Coordinate", description: "You and the owner align on pickup, handover, and the balance." },
  { label: "Shoot", description: "Use the gear (and operator, if booked) on your shoot dates." },
  { label: "Return", description: "Hand the gear back at the end of the rental period." },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Verified owners", sub: "Gear from vetted rental partners." },
  { icon: Wallet, label: "Secure 30% downpayment", sub: "Reserve via PayMongo — GCash, Maya, card." },
  { icon: UserCog, label: "Operators on demand", sub: "Add a trained operator to any kit." },
  { icon: MessageSquare, label: "Direct coordination", sub: "Talk to the owner once you reserve." },
];

export default function AboutPage() {
  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <p className="section-kicker">About</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 0.98, letterSpacing: "-0.04em", margin: "8px 0 12px" }}>
        A quieter way to reserve production rentals.
      </h1>
      <p style={{ maxWidth: 760, color: "#6c675f", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        VissionLink keeps gear browsing, availability requests, rental duration, and downpayment confirmation in one
        customer-friendly flow for film, TV, and production teams. We hold no inventory — every camera, light, and rig
        comes from independent owners across the Philippines, reserved with a simple 30% downpayment.
      </p>

      <Link
        href={"/store" as Route}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 22,
          background: "#f5c518",
          color: "#15130f",
          fontWeight: 800,
          padding: "13px 26px",
          borderRadius: 999,
          boxShadow: "0 10px 22px rgba(245,197,24,0.4)",
          textDecoration: "none",
        }}
      >
        Browse gear <ArrowRight size={16} />
      </Link>

      {/* How it works */}
      <section style={{ marginTop: 52 }}>
        <p className="section-kicker">How it works</p>
        <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, letterSpacing: "-0.02em", margin: "8px 0 20px" }}>
          From reserved to wrapped.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 14 }}>
          {RENTAL_FLOW.map((step, i) => (
            <div key={step.label} className="surface" style={{ padding: 18, border: "1px solid rgba(17,17,17,0.1)" }}>
              <div style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#15130f", color: "#fffdf8", fontSize: 13, fontWeight: 800, borderRadius: 999 }}>
                {i + 1}
              </div>
              <p style={{ margin: "12px 0 4px", fontWeight: 700, fontSize: 15 }}>{step.label}</p>
              <p style={{ margin: 0, color: "#6c675f", fontSize: 13, lineHeight: 1.6 }}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why VissionLink */}
      <section style={{ marginTop: 52 }}>
        <p className="section-kicker">Why VissionLink</p>
        <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, letterSpacing: "-0.02em", margin: "8px 0 20px" }}>
          Built for production teams.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 14 }}>
          {TRUST_POINTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="surface" style={{ padding: 18, border: "1px solid rgba(17,17,17,0.1)" }}>
              <Icon size={22} color="#d8a800" />
              <p style={{ margin: "12px 0 4px", fontWeight: 700, fontSize: 15 }}>{label}</p>
              <p style={{ margin: 0, color: "#6c675f", fontSize: 13, lineHeight: 1.6 }}>{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="surface" style={{ marginTop: 52, padding: "40px 28px", textAlign: "center", background: "#15130f" }}>
        <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, color: "#fffdf8", margin: "0 0 8px" }}>Ready to gear up?</h2>
        <p style={{ color: "rgba(247,247,242,0.7)", fontSize: 14, margin: "0 auto 22px", maxWidth: 460 }}>
          Browse cameras, lighting, grip, audio, drones, and more from owners across the Philippines.
        </p>
        <Link
          href={"/store" as Route}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fffdf8", color: "#15130f", fontWeight: 800, padding: "13px 28px", borderRadius: 999, textDecoration: "none" }}
        >
          Browse gear <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
