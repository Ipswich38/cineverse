"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, PackageCheck, Truck } from "lucide-react";

// Courier check-in page, opened from the signed link the admin hands the rider.
// Mobile-first, three big actions: check in GPS position, mark delivered
// (arrived), mark picked up from the renter (left premises). Shows no client
// PII — just the order number and item list the rider already has on the waybill.

type Bootstrap = { orderNo: string; status: string; items: string[]; dateTo: string | null };

const bigBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  width: "100%", padding: "16px 18px", borderRadius: 14, border: "none",
  fontSize: 16, fontWeight: 700, cursor: "pointer",
};

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

function TrackInner() {
  const token = useSearchParams().get("token") ?? "";
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setLoadErr("Missing tracking link."); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/track?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) setLoadErr(data.error || "Invalid tracking link.");
        else setBoot(data);
      } catch { if (alive) setLoadErr("Could not load. Check your connection."); }
    })();
    return () => { alive = false; };
  }, [token]);

  async function send(action?: "arrived" | "left_premises") {
    setBusy(action ?? "checkin");
    setMsg("");
    const pos = await getPosition();
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...(pos ?? {}), ...(action ? { action } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || "Failed — try again."); return; }
      const parts: string[] = [];
      if (pos) parts.push(`Location checked in (${data.unitsUpdated} unit${data.unitsUpdated === 1 ? "" : "s"})`);
      else parts.push("No GPS available — allow location access for position check-ins");
      if (data.statusChanged && action) parts.push(`status updated: ${action.replace(/_/g, " ")}`);
      setMsg(parts.join(" · ") + ".");
      if (data.statusChanged && action && boot) setBoot({ ...boot, status: action });
    } catch {
      setMsg("Failed — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-container" style={{ padding: "36px 0 80px", maxWidth: 480 }}>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 26, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
        <Truck size={24} /> Delivery check-in
      </h1>

      {loadErr && (
        <div className="surface" style={{ padding: 18, borderRadius: 14, marginTop: 12 }}>
          <p style={{ color: "#6c675f", margin: 0 }}>{loadErr} Ask the BMR team for a fresh link.</p>
        </div>
      )}

      {!loadErr && !boot && <p style={{ color: "#6c675f", display: "inline-flex", gap: 8, alignItems: "center", marginTop: 12 }}><Loader2 size={16} className="spin" /> Loading…</p>}

      {boot && (
        <>
          <div className="surface" style={{ padding: 16, borderRadius: 14, marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 800, fontFamily: '"Jost", sans-serif', fontSize: 17 }}>{boot.orderNo}</p>
            <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13, textTransform: "capitalize" }}>Status: {boot.status.replace(/_/g, " ") || "—"}{boot.dateTo ? ` · due back ${boot.dateTo}` : ""}</p>
            {boot.items.length > 0 && <p style={{ margin: "8px 0 0", color: "#3a362f", fontSize: 13 }}>{boot.items.join(", ")}</p>}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <button onClick={() => send()} disabled={busy !== null} style={{ ...bigBtn, background: "#fffdf8", color: "#15130f", border: "1px solid rgba(17,17,17,0.18)", opacity: busy ? 0.6 : 1 }}>
              {busy === "checkin" ? <Loader2 size={18} className="spin" /> : <MapPin size={18} />} Check in my location
            </button>
            {boot.status === "shipped" && (
              <button onClick={() => send("arrived")} disabled={busy !== null} style={{ ...bigBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>
                {busy === "arrived" ? <Loader2 size={18} className="spin" /> : <PackageCheck size={18} />} Delivered to renter
              </button>
            )}
            {(boot.status === "arrived" || boot.status === "shipped") && (
              <button onClick={() => send("left_premises")} disabled={busy !== null} style={{ ...bigBtn, background: "#2f6b46", color: "#fff", opacity: busy ? 0.6 : 1 }}>
                {busy === "left_premises" ? <Loader2 size={18} className="spin" /> : <Truck size={18} />} Picked up from renter
              </button>
            )}
          </div>

          {msg && (
            <p style={{ marginTop: 14, fontSize: 14, color: "#2f6b46", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} /> <span style={{ color: "#3a362f" }}>{msg}</span>
            </p>
          )}
          <p style={{ marginTop: 18, fontSize: 12, color: "#8a8378" }}>
            Tap “Check in my location” at pickup, delivery, and return so the BMR team can follow the gear. Your phone will ask for location permission once.
          </p>
        </>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "36px 0 80px" }} />}>
      <TrackInner />
    </Suspense>
  );
}
