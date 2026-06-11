"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Loader2, Mail } from "lucide-react";

// Passwordless order history: ask for an email → a signed link arrives by mail →
// the link opens this same page with ?token= and lists that email's orders.
// No accounts, no passwords — the inbox is the authentication.

type OrderRow = {
  id: string;
  orderNo: string;
  status?: string | null;
  fulfillmentStatus?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  project?: string | null;
  items: { name?: string; qty?: number; days?: number }[];
  amountPaid?: number | null;
  estTotal?: number | null;
  cancelStatus?: string | null;
  createdAt?: string | null;
};

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(17,17,17,0.18)",
  fontSize: 14, background: "#fffdf8", color: "#15130f", flex: 1, minWidth: 220,
};

function MyOrdersInner() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";

  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/my-orders?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) setLoadErr(data.error || "This link is invalid or has expired.");
        else { setOrders(data.orders); setEmail(data.email); }
      } catch {
        if (alive) setLoadErr("Could not load your orders. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  async function requestLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const em = (e.currentTarget.elements.namedItem("em") as HTMLInputElement)?.value.trim() ?? "";
    if (!em) return;
    setSending(true);
    try { await fetch("/api/my-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em }) }); } catch { /* same message either way */ }
    setSending(false);
    setRequested(true);
  }

  return (
    <div className="app-container" style={{ padding: "44px 0 90px", maxWidth: 640 }}>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(26px, 4vw, 38px)", margin: "0 0 6px" }}>My orders</h1>

      {!token && (
        <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
          {requested ? (
            <p style={{ margin: 0, fontSize: 14, color: "#3a362f", display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
              <Mail size={18} color="#2f6b46" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>If we have bookings under that email, a secure link is on its way (valid 7 days). Check your inbox — and the spam folder, just in case.</span>
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 10px", color: "#3a362f", fontSize: 14 }}>
                Enter the email you used for your bookings and we&apos;ll send you a secure link — no account or password needed.
              </p>
              <form onSubmit={requestLink} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input name="em" type="email" required placeholder="you@email.com" style={inputStyle} />
                <button type="submit" disabled={sending} style={{ background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: sending ? 0.7 : 1 }}>
                  {sending ? "Sending…" : "Email me a link"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {token && loading && <p style={{ color: "#6c675f", display: "inline-flex", gap: 8, alignItems: "center" }}><Loader2 size={16} className="spin" /> Loading…</p>}

      {token && !loading && loadErr && (
        <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
          <p style={{ color: "#6c675f", margin: 0 }}>
            {loadErr} <Link href="/my-orders" style={{ color: "#15130f", fontWeight: 600 }}>Request a new link</Link>.
          </p>
        </div>
      )}

      {token && !loading && orders && (
        <>
          <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13 }}>{email} · {orders.length} booking{orders.length === 1 ? "" : "s"}</p>
          {orders.length === 0 && (
            <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
              <p style={{ color: "#6c675f", margin: 0 }}>No bookings under this email yet. <Link href="/store" style={{ color: "#15130f", fontWeight: 600 }}>Browse gear</Link> to get started.</p>
            </div>
          )}
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {orders.map((o) => (
              <Link key={o.id} href={{ pathname: `/order/${o.id}`, query: { email } }} className="surface" style={{ padding: 16, borderRadius: 14, textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 15, fontFamily: '"Jost", sans-serif' }}>{o.orderNo}</span>
                  <span style={{ color: "#6c675f", fontSize: 13, textTransform: "capitalize" }}>{(o.fulfillmentStatus ?? o.status ?? "").replace(/_/g, " ")}</span>
                </div>
                {(o.dateFrom || o.dateTo) && (
                  <p style={{ margin: "6px 0 0", color: "#6c675f", fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <CalendarDays size={14} /> {o.dateFrom ?? "—"} → {o.dateTo ?? "—"}
                  </p>
                )}
                {o.items.length > 0 && (
                  <p style={{ margin: "6px 0 0", color: "#3a362f", fontSize: 13 }}>
                    {o.items.slice(0, 3).map((it) => it.name ?? "Equipment").join(", ")}{o.items.length > 3 ? ` +${o.items.length - 3} more` : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "44px 0 90px" }} />}>
      <MyOrdersInner />
    </Suspense>
  );
}
