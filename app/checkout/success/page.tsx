"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useStore } from "../../providers";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "44px 0 90px" }}>Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const order = params.get("order");
  const { clearCart } = useStore();
  const [state, setState] = useState<"checking" | "done" | "pending">("checking");
  const cleared = useRef(false);

  // Payment succeeded (PayMongo redirected here) — empty the cart, then confirm
  // the order was finalized (docs generated + emailed). The webhook is primary;
  // hitting the status endpoint also runs the finalize as a fallback.
  useEffect(() => {
    if (!cleared.current) { clearCart(); cleared.current = true; }
    if (!order) { setState("pending"); return; }
    let tries = 0;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/checkout/status?order=${encodeURIComponent(order)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (data.fulfillment_status && data.fulfillment_status !== "pending_payment") { setState("done"); return; }
      } catch { /* keep polling */ }
      if (!alive) return;
      if (++tries >= 8) { setState("pending"); return; }
      setTimeout(poll, 1500);
    };
    void poll();
    return () => { alive = false; };
  }, [order, clearCart]);

  return (
    <div className="app-container" style={{ padding: "44px 0 90px", maxWidth: 640, textAlign: "center" }}>
      <div style={{ display: "inline-flex", width: 64, height: 64, borderRadius: 999, background: "#e7efe9", color: "#2f6b46", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <CheckCircle2 size={34} />
      </div>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1, margin: "0 0 12px" }}>Payment received</h1>
      <p style={{ color: "#6c675f", lineHeight: 1.7 }}>
        Thank you — your rental is confirmed{order ? <> (ref <strong style={{ color: "#15130f" }}>{order}</strong>)</> : ""}.
      </p>

      <div style={{ marginTop: 18, padding: 16, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 12, display: "inline-flex", gap: 10, alignItems: "center", textAlign: "left", maxWidth: 460 }}>
        {state === "checking" ? <Loader2 size={20} className="spin" /> : <Mail size={20} color="#2f6b46" />}
        <span style={{ fontSize: 13, color: "#3a362f", lineHeight: 1.5 }}>
          {state === "done"
            ? "Your invoice and lease contract have been emailed to you. The team will arrange pickup / delivery for your dates."
            : state === "pending"
              ? "Your invoice and lease contract are being prepared and will arrive by email shortly."
              : "Preparing your invoice and lease contract…"}
        </span>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link href="/store" className="secondary-button">Back to store</Link>
      </div>
    </div>
  );
}
