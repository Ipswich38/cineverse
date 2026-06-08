"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, CalendarDays, PackageCheck } from "lucide-react";
import { REASON_CATEGORIES, MIN_REASON_LEN } from "@/lib/cancellation";

type OrderSummary = {
  id: string; orderNo: string; status: string; fulfillmentStatus: string | null;
  dateFrom: string | null; dateTo: string | null; project: string | null;
  items: { name?: string; qty?: number; days?: number }[];
  amountPaid: number | string | null; estTotal: number | string | null;
  cancelStatus: string | null;
};

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "44px 0 90px" }}>Loading…</div>}>
      <OrderContent />
    </Suspense>
  );
}

function OrderContent() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;
  const emailParam = (search.get("email") ?? "").trim();

  // Email is the light token. It arrives in the confirmation-email link; if someone
  // lands here without it (e.g. from the success page), we ask for it first.
  const [enteredEmail, setEnteredEmail] = useState("");
  const email = emailParam || enteredEmail;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(Boolean(emailParam));

  // Request form (revealed by the quiet disclosure)
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!email) return; // wait for the email prompt
    let alive = true;
    (async () => {
      setLoading(true); setLoadErr("");
      try {
        const res = await fetch(`/api/order/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Order not found.");
        if (alive) setOrder(data.order as OrderSummary);
      } catch (err) { if (alive) setLoadErr(err instanceof Error ? err.message : "Order not found."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id, email]);

  const reasonOk = reason.trim().length >= MIN_REASON_LEN;
  const alreadyRequested = order?.cancelStatus === "requested";
  const alreadyCancelled = order?.cancelStatus === "refunded" || order?.cancelStatus === "cancelled" || order?.fulfillmentStatus === "cancelled";

  const submit = async () => {
    setSubmitErr("");
    if (!category) { setSubmitErr("Please choose a reason category."); return; }
    if (!reasonOk) { setSubmitErr(`Please add a little more detail (at least ${MIN_REASON_LEN} characters).`); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/order/${encodeURIComponent(id)}/cancel-request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit your request.");
      setSubmitted(true); setOpen(false);
    } catch (err) { setSubmitErr(err instanceof Error ? err.message : "Could not submit your request."); }
    finally { setSubmitting(false); }
  };

  const dates = useMemo(() => {
    if (!order) return "";
    if (!order.dateFrom && !order.dateTo) return "";
    return `${order.dateFrom ?? "—"} → ${order.dateTo ?? "—"}`;
  }, [order]);

  return (
    <div className="app-container" style={{ padding: "44px 0 90px", maxWidth: 640 }}>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(26px, 4vw, 38px)", margin: "0 0 6px" }}>Your booking</h1>

      {!email && (
        <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
          <p style={{ margin: "0 0 10px", color: "#3a362f", fontSize: 14 }}>Enter the email you used for this booking to view it.</p>
          <form onSubmit={(e) => { e.preventDefault(); setEnteredEmail((e.currentTarget.elements.namedItem("em") as HTMLInputElement)?.value.trim() ?? ""); }} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input name="em" type="email" required placeholder="you@email.com" style={{ ...selStyle, maxWidth: 280 }} />
            <button type="submit" style={{ background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>View booking</button>
          </form>
        </div>
      )}

      {email && loading && <p style={{ color: "#6c675f", display: "inline-flex", gap: 8, alignItems: "center" }}><Loader2 size={16} className="spin" /> Loading…</p>}

      {!loading && loadErr && (
        <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
          <p style={{ color: "#6c675f", margin: 0 }}>We couldn&apos;t find this booking. Please open the link from your confirmation email, or <Link href="/contact" style={{ color: "#15130f", fontWeight: 600 }}>contact us</Link>.</p>
        </div>
      )}

      {!loading && order && (
        <>
          <div className="surface" style={{ padding: 18, borderRadius: 16, marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 18, fontFamily: '"Jost", sans-serif' }}>{order.orderNo}</p>
            <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13, textTransform: "capitalize" }}>
              Status: {(order.fulfillmentStatus ?? order.status ?? "").replace(/_/g, " ")}
            </p>
            {order.project && <p style={{ margin: "8px 0 0", color: "#3a362f", fontSize: 14 }}>{order.project}</p>}
            {dates && <p style={{ margin: "6px 0 0", color: "#6c675f", fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}><CalendarDays size={14} /> {dates}</p>}
            {order.items.length > 0 && (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {order.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "#15130f", borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6 }}>
                    <span>{it.name ?? "Equipment"}</span>
                    <span style={{ color: "#6c675f" }}>{it.days ?? 1} day(s) × {it.qty ?? 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiet, un-promoted disclosure — a request, reviewed by the team. */}
          <div style={{ marginTop: 18 }}>
            {submitted || alreadyRequested ? (
              <div className="surface" style={{ padding: 16, borderRadius: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <PackageCheck size={18} color="#2f6b46" style={{ marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13.5, color: "#3a362f", lineHeight: 1.6 }}>
                  Your request has been received and is being reviewed by our team against the booking terms. We&apos;ll email you the outcome — nothing more to do for now.
                </p>
              </div>
            ) : alreadyCancelled ? (
              <p style={{ color: "#6c675f", fontSize: 13 }}>This booking has been cancelled. A credit memo, if applicable, was emailed to you.</p>
            ) : (
              <>
                {!open && (
                  <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#6c675f", fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
                    Need to make a change to this booking?
                  </button>
                )}
                {open && (
                  <div className="surface" style={{ padding: 18, borderRadius: 14 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontFamily: '"Jost", sans-serif', fontSize: 16 }}>Request a change or cancellation</p>
                    <p style={{ margin: "0 0 14px", color: "#6c675f", fontSize: 12.5, lineHeight: 1.6 }}>
                      This is a request, reviewed by our team against the Cancellation &amp; Refund terms you accepted at booking. Depending on timing, the reservation downpayment may be subject to fees. Please tell us what changed.
                    </p>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3a362f", marginBottom: 4 }}>Reason</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={selStyle}>
                      <option value="">Select a reason…</option>
                      {REASON_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3a362f", margin: "12px 0 4px" }}>Details</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      placeholder="Please explain your situation so the team can review it fairly…"
                      style={{ ...selStyle, resize: "vertical", minHeight: 96 }}
                    />
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: reasonOk ? "#2f6b46" : "#8a8378" }}>
                      {reason.trim().length}/{MIN_REASON_LEN} characters minimum
                    </p>
                    {submitErr && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>{submitErr}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button onClick={submit} disabled={submitting || !category || !reasonOk} style={{ background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: submitting || !category || !reasonOk ? "not-allowed" : "pointer", opacity: submitting || !category || !reasonOk ? 0.55 : 1 }}>
                        {submitting ? "Submitting…" : "Submit request"}
                      </button>
                      <button onClick={() => { setOpen(false); setSubmitErr(""); }} disabled={submitting} style={{ background: "none", border: "none", color: "#6c675f", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <p style={{ marginTop: 22, fontSize: 12.5, color: "#8a8378" }}>
            Questions? <Link href="/contact" style={{ color: "#15130f", fontWeight: 600 }}>Contact our team</Link> or just reply to your confirmation email.
          </p>
        </>
      )}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(17,17,17,0.18)",
  background: "#fffdf8", fontSize: 14, color: "#15130f", fontFamily: "inherit",
};
