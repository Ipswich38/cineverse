"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Copy, Loader2, MapPin, PackageCheck, RefreshCw, Truck } from "lucide-react";

// Fleet map + active-deliveries board for the admin Equipment Monitoring view.
// MapLibre + OpenStreetMap raster tiles: free, no API key. Unit positions come
// from vissionlink_units (lat/lng/last_seen), fed by courier check-ins today and
// hardware GPS trackers later — both write through POST /api/track.

type Unit = {
  id: string; name: string; serial?: string | null; status: string;
  lat?: number | null; lng?: number | null; last_seen?: string | null;
  location_label?: string | null; assigned_request_id?: string | null;
};
type Order = {
  id: string; order_no?: string | null; name?: string | null;
  fulfillment_status?: string | null; date_from?: string | null; date_to?: string | null;
};

const ACTIVE = ["paid", "shipped", "arrived", "left_premises"];
const STATUS_COLOR: Record<string, string> = { available: "#2f6b46", rented: "#d8a800", maintenance: "#8a8378", retired: "#6c675f" };
// Next admin-side step for each delivery state (couriers can also set the middle two).
const NEXT_STEP: Record<string, { to: string; label: string }> = {
  paid: { to: "shipped", label: "Mark shipped" },
  shipped: { to: "arrived", label: "Mark arrived at renter" },
  arrived: { to: "left_premises", label: "Mark left premises" },
  left_premises: { to: "returned", label: "Mark returned" },
};

const chip: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#fff", borderRadius: 999, padding: "2px 8px", textTransform: "capitalize" };
const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(17,17,17,0.16)", background: "#fffdf8", color: "#15130f", cursor: "pointer" };

export default function AdminFleetMap({ authCode }: { authCode: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${authCode}` };
      const [u, q] = await Promise.all([
        fetch("/api/admin/units", { headers, cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/quotes", { headers, cache: "no-store" }).then((r) => r.json()),
      ]);
      if (Array.isArray(u)) setUnits(u);
      if (Array.isArray(q)) setOrders(q.filter((o: Order) => ACTIVE.includes(String(o.fulfillment_status ?? ""))));
      setErr("");
    } catch {
      setErr("Could not refresh tracking data.");
    }
  }, [authCode]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30000); // "real-time" = as fresh as the last ping
    return () => clearInterval(t);
  }, [load]);

  // Map boots once; markers re-render on every data refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!mapEl.current || mapRef.current) return;
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !mapEl.current) return;
      mapRef.current = new maplibregl.Map({
        container: mapEl.current,
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [121.77, 12.88], // Philippines
        zoom: 4.7,
      });
      mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      if (!map) return;
      const maplibregl = (await import("maplibre-gl")).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const placed = units.filter((u) => typeof u.lat === "number" && typeof u.lng === "number");
      for (const u of placed) {
        const order = u.assigned_request_id ? orders.find((o) => o.id === u.assigned_request_id) : undefined;
        const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
          `<div style="font:600 13px Arial">${u.name}</div>` +
          `<div style="font:12px Arial;color:#6c675f">${[u.serial && `SN ${u.serial}`, u.status, order && `order ${order.order_no ?? order.id}`].filter(Boolean).join(" · ")}</div>` +
          (u.last_seen ? `<div style="font:11px Arial;color:#8a8378">seen ${new Date(u.last_seen).toLocaleString()}</div>` : ""),
        );
        const m = new maplibregl.Marker({ color: STATUS_COLOR[u.status] ?? "#15130f" })
          .setLngLat([u.lng as number, u.lat as number])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(m);
      }
      if (placed.length) {
        const lats = placed.map((u) => u.lat as number);
        const lngs = placed.map((u) => u.lng as number);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 60, maxZoom: 13, duration: 600 });
      }
    })();
  }, [units, orders]);

  const advance = async (orderId: string, to: string) => {
    if (to === "returned" && !confirm("Mark this rental returned? Its units check back into inventory.")) return;
    setBusy(orderId);
    try {
      await fetch(`/api/admin/quotes?id=${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillment: to }),
      });
      await load();
    } finally { setBusy(null); }
  };

  const copyLink = async (orderId: string) => {
    setBusy(orderId);
    try {
      const res = await fetch(`/api/admin/track-link?orderId=${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${authCode}` } });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        setCopied(orderId);
        setTimeout(() => setCopied(null), 2500);
      }
    } finally { setBusy(null); }
  };

  const tracked = units.filter((u) => typeof u.lat === "number" && typeof u.lng === "number").length;

  return (
    <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <h3 style={{ fontFamily: "Arial, Helvetica, sans-serif", margin: 0 }}>Fleet map</h3>
        <span style={{ fontSize: 12, color: "#6c675f" }}>{tracked} of {units.length} units have a last-known position · refreshes every 30s</span>
        <button onClick={() => void load()} style={{ ...btn, marginLeft: "auto" }}><RefreshCw size={13} /> Refresh</button>
      </div>
      {err && <p style={{ color: "#c0392b", fontSize: 13 }}>{err}</p>}

      <div ref={mapEl} style={{ height: 380, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(17,17,17,0.12)" }} />
      <p style={{ fontSize: 11.5, color: "#8a8378", margin: "8px 0 0" }}>
        Positions come from courier check-ins (and GPS trackers once installed). Marker colors: <span style={{ color: "#2f6b46" }}>available</span> · <span style={{ color: "#b08600" }}>rented</span> · <span style={{ color: "#8a8378" }}>maintenance</span>.
      </p>

      <div style={{ marginTop: 16 }}>
        <h4 style={{ fontFamily: "Arial, Helvetica, sans-serif", margin: "0 0 8px", display: "inline-flex", alignItems: "center", gap: 6 }}><Truck size={15} /> Active deliveries & rentals</h4>
        {orders.length === 0 && <p style={{ color: "#6c675f", fontSize: 13, margin: 0 }}>Nothing out with clients right now.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {orders.map((o) => {
            const st = String(o.fulfillment_status);
            const next = NEXT_STEP[st];
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.order_no ?? o.id}</div>
                  <div style={{ fontSize: 12, color: "#6c675f" }}>{[o.name, o.date_from && o.date_to && `${o.date_from} → ${o.date_to}`].filter(Boolean).join(" · ")}</div>
                </div>
                <span style={{ ...chip, background: st === "left_premises" ? "#2f6b46" : st === "arrived" ? "#b06a00" : st === "shipped" ? "#d8a800" : "#8a8378" }}>{st.replace(/_/g, " ")}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                  {next && (
                    <button onClick={() => void advance(o.id, next.to)} disabled={busy === o.id} style={{ ...btn, opacity: busy === o.id ? 0.6 : 1 }}>
                      {busy === o.id ? <Loader2 size={13} className="spin" /> : <PackageCheck size={13} />} {next.label}
                    </button>
                  )}
                  <button onClick={() => void copyLink(o.id)} disabled={busy === o.id} style={{ ...btn, background: copied === o.id ? "#2f6b46" : "#15130f", color: copied === o.id ? "#fff" : "#ffcc00", border: "none" }}>
                    {copied === o.id ? <MapPin size={13} /> : <Copy size={13} />} {copied === o.id ? "Link copied!" : "Courier link"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11.5, color: "#8a8378", margin: "8px 0 0" }}>
          “Courier link” copies a 14-day link for the delivery rider: it checks in GPS position and can mark <em>arrived</em> / <em>left premises</em> for that one order only.
        </p>
      </div>
    </div>
  );
}
