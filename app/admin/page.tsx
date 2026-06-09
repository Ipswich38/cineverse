"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Calculator, CornerUpLeft, ExternalLink, Eye, FileText, LayoutDashboard, Loader2, LockKeyhole, LogOut, Mail, MapPin, Package, PackageCheck, Pencil, Phone, Plus, QrCode, Radio, Receipt, RefreshCw, Save, ScrollText, Send, Shield, ShoppingBag, Trash2, Truck, Users, X } from "lucide-react";
import { useStore } from "../providers";
import { currency, slugify, type EquipmentItem } from "@/lib/catalog";
import { CATEGORY_FLAT, categoryName, normalizeCategory } from "@/lib/categories";
import ProposalBuilder from "./ProposalBuilder";
import AdminAssistant from "@/components/AdminAssistant";
import { computeTotals, formatPHP, lineAmount, type QuotationDoc, type QuotationLine } from "@/lib/quotation";
import { type ContractDoc } from "@/lib/contract";
import { computeInvoiceMoney, CHANNEL_LABELS, ALL_CHANNELS, type InvoiceDoc, type PaymentChannel, type PaymentEntry, type Incident } from "@/lib/invoice";
import { type ClientPolicy } from "@/lib/clients";
import { PERSONNEL_RATES, RATE_CARD } from "@/lib/bmr-rate-card";
import { type PackageOffer } from "@/lib/package-offers";
import { REASON_CATEGORIES, MIN_REASON_LEN } from "@/lib/cancellation";
import { displayPaymentId, displayRentalOrderId } from "@/lib/display-ids";

// Admin mini-apps shown in the sidebar. ("ops"/"proposals" remain as views but
// are no longer surfaced — equipment-listing editing was retired from admin.)
type AdminView = "dashboard" | "clients-orders" | "inbox" | "accounting" | "inventory" | "packages" | "monitoring" | "ops" | "proposals";
const ADMIN_SECTIONS: { key: AdminView; label: string; icon: ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { key: "clients-orders", label: "Clients & Orders", icon: <Users size={17} /> },
  { key: "inbox", label: "Inbox", icon: <Mail size={17} /> },
  { key: "accounting", label: "Accounting", icon: <Calculator size={17} /> },
  { key: "inventory", label: "Inventory", icon: <Boxes size={17} /> },
  { key: "packages", label: "Packages", icon: <Package size={17} /> },
  { key: "monitoring", label: "Equipment Monitoring", icon: <Radio size={17} /> },
];

function AdminSidebar({ view, setView, onLogout }: { view: AdminView; setView: (v: AdminView) => void; onLogout: () => void }) {
  return (
    <aside style={{ width: 232, flexShrink: 0, background: "#15130f", color: "#fffdf8", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100dvh" }}>
      <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 20, fontWeight: 800, color: "#ffcc00" }}>BMR Admin</div>
        <div style={{ fontSize: 11, color: "rgba(255,253,248,0.6)", marginTop: 2 }}>Operations console</div>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {ADMIN_SECTIONS.map((s) => {
          const active = view === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setView(s.key)}
              style={{
                width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 2,
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: active ? "#ffcc00" : "transparent",
                color: active ? "#15130f" : "rgba(255,253,248,0.82)",
              }}
            >
              {s.icon}{s.label}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, justifyContent: "center", background: "rgba(255,255,255,0.08)", color: "#fffdf8", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, cursor: "pointer" }}>
          <LogOut size={15} /> Log out
        </button>
      </div>
    </aside>
  );
}

export default function AdminPage() {
  const { catalog, refreshCatalog } = useStore();
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockErr, setUnlockErr] = useState("");
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [view, setView] = useState<AdminView>("dashboard");
  const [busy, setBusy] = useState(false);

  const approvedCount = useMemo(() => catalog.length, [catalog]);

  // Validate the typed code on the server (the real secret never ships to the
  // browser). On success we keep the code and reuse it as the Bearer token.
  const unlock = async () => {
    if (!code) return;
    setUnlocking(true);
    setUnlockErr("");
    try {
      const res = await fetch("/api/admin/verify", { method: "POST", headers: { Authorization: `Bearer ${code}` } });
      if (res.ok) {
        setUnlocked(true);
        try { localStorage.setItem("vl_admin_code", code); } catch {}
      } else {
        setUnlockErr("That code didn't work.");
      }
    } catch {
      setUnlockErr("Couldn't verify right now — please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  // Stay logged in across reloads: restore a saved code and re-verify it on mount.
  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("vl_admin_code"); } catch {}
    if (!stored) return;
    (async () => {
      try {
        const res = await fetch("/api/admin/verify", { method: "POST", headers: { Authorization: `Bearer ${stored}` } });
        if (res.ok) { setCode(stored as string); setUnlocked(true); }
        else { try { localStorage.removeItem("vl_admin_code"); } catch {} }
      } catch { /* offline — stay locked but keep the saved code */ }
    })();
  }, []);

  const logout = () => {
    try { localStorage.removeItem("vl_admin_code"); } catch {}
    setUnlocked(false);
    setCode("");
    setEditing(null);
    setView("dashboard");
  };

  const saveEquipment = async (item: EquipmentItem, mode: "POST" | "PUT") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/equipment", {
        method: mode,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${code}` },
        body: JSON.stringify(item),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not save listing.");
        return;
      }
      await refreshCatalog();
    } finally {
      setBusy(false);
    }
  };

  const removeEquipment = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/equipment?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${code}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete listing.");
        return;
      }
      await refreshCatalog();
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="app-container" style={{ padding: "40px 0 76px", maxWidth: 560 }}>
        <div className="surface" style={{ padding: 22, borderRadius: 20 }}>
          <Shield size={26} color="#ffcc00" />
          <h1 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 34, margin: "12px 0 10px" }}>Admin access</h1>
          <p style={{ color: "#6c675f" }}>Use the private code to manage inventory listings and the customer inbox.</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void unlock(); }} placeholder="Admin code" style={inputStyle} />
          <button onClick={() => void unlock()} disabled={unlocking || !code} style={{ marginTop: 14, background: "#f1f1ee", color: "#111", border: "none", borderRadius: 999, padding: "14px 22px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, opacity: unlocking || !code ? 0.6 : 1 }}>
            {unlocking ? <Loader2 size={16} className="spin" /> : <LockKeyhole size={16} />} Unlock
          </button>
          {unlockErr && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 10 }}>{unlockErr}</p>}
        </div>
      </div>
    );
  }

  const section = ADMIN_SECTIONS.find((s) => s.key === view);

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "#efece4", color: "#15130f", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <AdminAssistant authCode={code} />
      <AdminSidebar view={view} setView={setView} onLogout={logout} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px clamp(14px,3vw,28px)", background: "#fffdf8", borderBottom: "1px solid rgba(17,17,17,0.1)", position: "sticky", top: 0, zIndex: 10 }}>
          {section?.icon}
          <h1 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 20, margin: 0 }}>{section?.label ?? "Admin"}</h1>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6c675f" }}>BMR Operations · VissionLink</span>
        </header>
        <main style={{ padding: "20px clamp(12px,3vw,28px) 64px", flex: 1, minWidth: 0 }}>
          {view === "dashboard" && <DashboardPanel authCode={code} listingCount={approvedCount} setView={setView} />}
          {view === "clients-orders" && <ClientsOrdersPanel authCode={code} />}
          {view === "inbox" && <InboxPanel authCode={code} />}
          {view === "accounting" && <AccountingPanel authCode={code} />}
          {view === "inventory" && (
            <div style={{ display: "grid", gap: 16 }}>
              <section className="surface" style={{ padding: 18, borderRadius: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                  <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 22, margin: 0 }}>Inventory manager</h2>
                  <span style={{ fontSize: 12, color: "#6c675f" }}>{approvedCount} live listing{approvedCount === 1 ? "" : "s"}</span>
                  <a href="/store" target="_blank" rel="noreferrer" style={{ ...miniBtn, marginLeft: "auto", textDecoration: "none" }}><ExternalLink size={14} /> Storefront</a>
                </div>
                <p style={{ color: "#6c675f", fontSize: 13, margin: "0 0 14px" }}>Add, edit, or remove rental listings. Prices and details you save here sync to the live storefront automatically.</p>
                <InventoryForm
                  key={editing?.id ?? "new"}
                  initial={editing}
                  authCode={code}
                  onSave={async (item) => {
                    await saveEquipment(item, editing ? "PUT" : "POST");
                    setEditing(null);
                  }}
                  onClear={() => setEditing(null)}
                />

                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  {catalog.map((item) => (
                    <div key={item.id} style={{ padding: 14, borderRadius: 16, background: "#f0ece3", border: "1px solid rgba(17,17,17,0.1)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div>
                        <strong>{item.name}</strong>
                        <div style={{ color: "#6c675f", fontSize: 13 }}>{categoryName(normalizeCategory(item.category))} · {currency(item.ratePerDay)}/day · stock {item.stock}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <a href={`/gear/${item.slug}`} target="_blank" rel="noreferrer" style={{ ...miniBtn, textDecoration: "none" }} title="Preview on the live site"><Eye size={14} /> Preview</a>
                        <button onClick={() => setEditing(item)} style={miniBtn} disabled={busy}><Pencil size={14} /> Edit</button>
                        <button onClick={() => { if (confirm(`Delete "${item.name}"? This removes it from the storefront.`)) void removeEquipment(item.id); }} style={miniBtn} disabled={busy}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <InventoryPanel authCode={code} />
            </div>
          )}
          {view === "packages" && <PackagesPanel authCode={code} />}
          {view === "monitoring" && <MonitoringPanel authCode={code} />}
          {view === "proposals" && <ProposalBuilder catalog={catalog} />}
        </main>
      </div>
    </div>
  );
}

// One line per entry → string[], and back. Used for specs and tags so the admin
// can edit them as readable lists instead of raw JSON.
const linesToArray = (text: string): string[] =>
  text.split("\n").map((s) => s.trim()).filter(Boolean);
const arrayToLines = (arr: string[]): string => (arr ?? []).join("\n");

function InventoryForm({
  initial,
  authCode,
  onSave,
  onClear,
}: {
  initial: EquipmentItem | null;
  authCode: string;
  onSave: (item: EquipmentItem) => void;
  onClear: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial ? normalizeCategory(initial.category) : (CATEGORY_FLAT[0]?.slug ?? ""));
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [ratePerDay, setRatePerDay] = useState(String(initial?.ratePerDay ?? 0));
  const [securityDeposit, setSecurityDeposit] = useState(String(initial?.securityDeposit ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 1));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [featured, setFeatured] = useState(Boolean(initial?.featured));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [specsText, setSpecsText] = useState(arrayToLines(initial?.specs ?? []));
  const [tagsText, setTagsText] = useState(arrayToLines(initial?.tags ?? []));
  const [urlToAdd, setUrlToAdd] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErr("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${authCode}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        setImages((prev) => [...prev, data.url as string]);
      }
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));
  const makePrimary = (idx: number) =>
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      return picked ? [picked, ...next] : prev;
    });

  const save = () => {
    if (!name.trim()) {
      alert("Please enter a name.");
      return;
    }
    const item: EquipmentItem = {
      // Preserve identity + slug on edit so existing /gear/[slug] links don't break.
      id: initial?.id ?? `item-${slugify(name)}-${Date.now()}`,
      slug: initial?.slug ?? slugify(name),
      name: name.trim(),
      category,
      description,
      owner,
      location,
      ratePerDay: Number(ratePerDay) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      stock: Number(stock) || 0,
      featured,
      images,
      specs: linesToArray(specsText),
      tags: linesToArray(tagsText),
      // Preserve booked/blocked dates managed elsewhere — never wipe on edit.
      unavailable: initial?.unavailable ?? [],
    };
    onSave(item);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
        <Field label="Name" value={name} onChange={setName} />
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "#6c675f", fontSize: 13 }}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {!CATEGORY_FLAT.some((c) => c.slug === category) && category && (
              <option value={category}>{categoryName(category)} (current)</option>
            )}
            {CATEGORY_FLAT.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </label>
        <Field label="Owner" value={owner} onChange={setOwner} />
        <Field label="Location" value={location} onChange={setLocation} />
        <Field label="Rate/day (₱)" value={ratePerDay} onChange={setRatePerDay} />
        <Field label="Security deposit (₱)" value={securityDeposit} onChange={setSecurityDeposit} />
        <Field label="Stock" value={stock} onChange={setStock} />
      </div>

      <Field label="Description" value={description} onChange={setDescription} textarea />

      <label style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, fontWeight: 700, color: "#15130f" }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ width: 18, height: 18 }} />
        Featured on the storefront
      </label>

      {/* Photos — upload to storage, or paste a URL. First photo is the cover. */}
      <div style={{ display: "grid", gap: 10 }}>
        <span style={{ color: "#6c675f", fontSize: 13 }}>Photos {images.length > 0 && `· ${images.length}`} (first is the cover)</span>
        {images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {images.map((src, idx) => (
              <div key={`${src}-${idx}`} style={{ position: "relative", width: 96, height: 96, borderRadius: 12, overflow: "hidden", border: idx === 0 ? "2px solid #d8a800" : "1px solid rgba(17,17,17,0.15)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: "auto 0 0 0", display: "flex", justifyContent: "space-between", gap: 4, padding: 4, background: "rgba(0,0,0,0.45)" }}>
                  {idx !== 0 ? (
                    <button onClick={() => makePrimary(idx)} title="Make cover" style={tinyBtn}>★</button>
                  ) : (
                    <span style={{ ...tinyBtn, background: "transparent", color: "#ffcc00" }}>cover</span>
                  )}
                  <button onClick={() => removeImage(idx)} title="Remove" style={tinyBtn}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <label style={{ ...miniBtn, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
            {uploading ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {uploading ? "Uploading…" : "Upload photos"}
            <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => { void uploadFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
          </label>
          <input value={urlToAdd} onChange={(e) => setUrlToAdd(e.target.value)} placeholder="…or paste an image URL" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
          <button
            onClick={() => { const u = urlToAdd.trim(); if (u) { setImages((prev) => [...prev, u]); setUrlToAdd(""); } }}
            style={miniBtn}
            disabled={!urlToAdd.trim()}
          >
            Add URL
          </button>
        </div>
        {uploadErr && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{uploadErr}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
        <Field label="Specs (one per line)" value={specsText} onChange={setSpecsText} textarea />
        <Field label="Tags (one per line)" value={tagsText} onChange={setTagsText} textarea />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save} style={miniBtn} disabled={uploading}>
          <Plus size={14} /> {initial ? "Save changes" : "Add listing"}
        </button>
        {initial && <button onClick={onClear} style={miniBtn}>Cancel</button>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: "#6c675f", fontSize: 13 }}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={inputStyle} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface" style={{ padding: 18, borderRadius: 20 }}>
      <div style={{ color: "#6c675f", fontSize: 13 }}>{label}</div>
      <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 32, marginTop: 8 }}>{value}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#fffdf8",
  color: "#15130f",
  border: "1px solid rgba(17,17,17,0.18)",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
};

const miniBtn: CSSProperties = {
  background: "#f1f1ee",
  color: "#111",
  border: "none",
  borderRadius: 999,
  padding: "10px 16px",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const tinyBtn: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  color: "#111",
  border: "none",
  borderRadius: 7,
  padding: "2px 7px",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.4,
  cursor: "pointer",
};

// Refined action buttons for the document cards. Quiet by default so the
// request details lead; at most one primary (dark) action per card. Aligned to
// the main site palette — ink #15130f, brand yellow #f5c518, paper #fffdf8.
const cardBtnBase: CSSProperties = {
  borderRadius: 8,
  padding: "7px 13px",
  fontSize: 12.5,
  fontWeight: 600,
  lineHeight: 1.3,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
};
const cardBtnPrimary: CSSProperties = { ...cardBtnBase, background: "#15130f", color: "#f5c518", fontWeight: 700 };
const cardBtnGhost: CSSProperties = { ...cardBtnBase, background: "#fffdf8", color: "#3a362f", borderColor: "rgba(17,17,17,0.18)" };
const cardBtnGreen: CSSProperties = { ...cardBtnBase, background: "#2f6b46", color: "#fff", fontWeight: 700 };
const cardBtnText: CSSProperties = { ...cardBtnBase, background: "transparent", color: "#6c675f", padding: "7px 8px" };
const cardBtnDanger: CSSProperties = { ...cardBtnBase, background: "transparent", color: "#b03a2e", padding: "7px 10px" };

// Custom package quote requests submitted from /packages.
type QuoteItem = {
  id?: string;
  slug?: string;
  name?: string;
  type?: string;
  qty?: number;
  days?: number;
  ratePerDay?: number;
};

type QuoteRequest = {
  id: string;
  created_at: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  project: string | null;
  date_from: string | null;
  date_to: string | null;
  notes: string | null;
  items: QuoteItem[];
  est_total: number | string | null;
  quotation?: QuotationDoc | null;
  invoice?: InvoiceDoc | null;
  status: "pending" | "responded" | "closed";
  quotation_status?: "none" | "draft" | "sent" | null;
  quotation_sent_at?: string | null;
  quotation_agreed_at?: string | null;
  contract_status?: "none" | "draft" | "sent" | "signed" | null;
  invoice_status?: "none" | "draft" | "sent" | null;
  channel?: "web" | "direct" | "rent" | null;
  fulfillment_status?: "pending_payment" | "processing" | "paid" | "shipped" | "returned" | "settled" | "cancelled" | null;
  security_deposit?: number | string | null;
  delivery_address?: string | null;
  order_no?: string | null;
  payment_method?: string | null;
  payment_ref?: string | null;
  paid_at?: string | null;
  balance_method?: "standard" | "full" | "pdc" | string | null;
  client_location?: string | null;
  client_ip?: string | null;
  amount_paid?: number | string | null;
  cancel_status?: "requested" | "approved" | "declined" | "refunded" | "cancelled" | null;
  cancel_reason_category?: string | null;
  cancel_reason?: string | null;
  cancel_admin_note?: string | null;
  refund_amount?: number | string | null;
  refund_method?: "paymongo" | "offline" | null;
  credit_memo_no?: string | null;
  credit_memo_pdf_path?: string | null;
};

type DocAttachment = "quotation" | "contract" | "invoice" | "creditMemo";

// Handlers an EngagementCard calls — the same actions whether the card is shown
// in a flat list or inside a client's group.
type EngagementHandlers = {
  openQuotation: (q: QuoteRequest) => void;
  openContract: (q: QuoteRequest) => void;
  openInvoice: (q: QuoteRequest) => void;
  openCancel: (q: QuoteRequest) => void;
  setStatus: (id: string, status: QuoteRequest["status"]) => void;
  setAgreed: (id: string, agreed: boolean) => void;
  setFulfillment: (id: string, fulfillment: string) => void;
  deleteQuote: (q: QuoteRequest) => void;
  declineCancel: (id: string) => void;
  emailDocuments: (q: QuoteRequest, attachments: DocAttachment[], message: string) => Promise<void>;
};

function shortHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  return Math.abs(h).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

const crmIdFor = (email: string) => `CRM-${shortHash(email.toLowerCase())}`;
const rentalOrderIdFor = (q: Pick<QuoteRequest, "id" | "order_no">) => displayRentalOrderId(q.id, q.order_no);
const paymentDisplayIdFor = (q: Pick<QuoteRequest, "id" | "payment_ref" | "invoice">) => displayPaymentId(q.invoice?.number ?? q.payment_ref ?? q.id);
const isRentalOrder = (q: QuoteRequest) => q.channel === "rent" || Boolean(q.fulfillment_status) || q.id.startsWith("r-");
const isQuoteRequest = (q: QuoteRequest) => !isRentalOrder(q);

function packageForLine(item: QuoteItem, packages: PackageOffer[]): PackageOffer | null {
  const raw = item.id ?? item.slug ?? "";
  if (!raw) return null;
  const id = raw.startsWith("pkg-") ? raw.slice(4) : raw;
  return packages.find((offer) => offer.id === id || offer.slug === id || offer.slug === item.slug) ?? null;
}

// One engagement (quote request / order) as a full-lifecycle card:
// quotation → contract → invoice → fulfillment → cancel/refund, plus the client
// cancellation-request banner and the payment/location detail.
function EngagementCard({ q, updating, on, packages = [] }: { q: QuoteRequest; updating: string | null; on: EngagementHandlers; packages?: PackageOffer[] }) {
  const total = Number(q.est_total) || 0;
  const stage = cardStage(q);
  const rental = isRentalOrder(q);
  const primaryDocLabel = rental ? "Rental order" : q.channel === "direct" ? "Manual quotation" : "Quote request";
  const clientId = crmIdFor(q.email);
  const rentalOrderId = rentalOrderIdFor(q);
  const paymentDisplayId = paymentDisplayIdFor(q);
  const paid = Number(q.amount_paid) || 0;
  const invoiceMoney = q.invoice ? computeInvoiceMoney(q.invoice) : null;
  const quoteMoney = q.quotation ? computeTotals(q.quotation) : null;
  const remaining = invoiceMoney ? invoiceMoney.balance : Math.max(0, total - paid);
  const discount = invoiceMoney?.discountsTotal ?? quoteMoney?.discount ?? 0;
  const reasonId = q.cancel_reason_category ? `RSN-${shortHash(`${q.id}:${q.cancel_reason_category}`)}` : null;
  const availableAttachments: { key: DocAttachment; label: string; enabled: boolean }[] = [
    { key: "quotation", label: "Quotation", enabled: Boolean(q.quotation || q.quotation_status && q.quotation_status !== "none") },
    { key: "contract", label: "Contract", enabled: Boolean(q.contract_status && q.contract_status !== "none") },
    { key: "invoice", label: "Invoice", enabled: Boolean(q.invoice_status && q.invoice_status !== "none") },
    { key: "creditMemo", label: "Credit memo", enabled: Boolean(q.credit_memo_no || q.credit_memo_pdf_path) },
  ];
  const defaultAttachments = availableAttachments.filter((a) => a.enabled && (rental ? a.key !== "quotation" : a.key === "quotation")).map((a) => a.key);
  const [emailAttachments, setEmailAttachments] = useState<DocAttachment[]>(defaultAttachments);
  const [emailMessage, setEmailMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const toggleAttachment = (key: DocAttachment) => setEmailAttachments((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  const sendQueuedEmail = async () => {
    setEmailBusy(true);
    setEmailNotice("");
    try {
      await on.emailDocuments(q, emailAttachments, emailMessage);
      setEmailNotice("Email queued/sent with selected attachment(s).");
    } finally {
      setEmailBusy(false);
    }
  };
  return (
    <article style={{ background: stage.tint, border: "1px solid rgba(17,17,17,0.12)", borderLeft: `5px solid ${stage.bar}`, borderRadius: 12, padding: "18px 18px 18px 20px", boxShadow: "0 1px 2px rgba(17,17,17,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <StageBadge stage={stage} />
            <DocChip label={primaryDocLabel} on tone={rental ? "green" : undefined} />
            <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 20, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              {rental ? rentalOrderId : q.name}
              {q.channel === "direct" && <span style={{ fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: "#e7efe9", color: "#2f6b46", borderRadius: 999, padding: "2px 8px" }}>direct</span>}
            </h3>
          </div>
          {rental && <p style={{ margin: "4px 0 0", color: "#15130f", fontSize: 13, fontWeight: 700 }}>{q.name}</p>}
          <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13 }}>
            {q.email}{q.phone ? ` / ${q.phone}` : ""}{q.company ? ` / ${q.company}` : ""}
          </p>
          {(q.project || q.date_from || q.date_to) && (
            <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13 }}>
              {[q.project, q.date_from && q.date_to ? `${q.date_from} to ${q.date_to}` : q.date_from || q.date_to].filter(Boolean).join(" / ")}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: q.status === "pending" ? "#fbf6e6" : q.status === "responded" ? "#eef4f0" : "#f0eef2", color: q.status === "pending" ? "#7a5a00" : q.status === "responded" ? "#2f6b46" : "#5b5750", border: "1px solid rgba(17,17,17,0.1)", padding: "4px 11px", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: q.status === "pending" ? "#caa000" : q.status === "responded" ? "#2f6b46" : "#b3ada2" }} />
            {q.status}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 6 }}>
            {q.quotation_status && q.quotation_status !== "none" && <DocChip label={`quotation ${q.quotation_status}`} on={q.quotation_status === "sent"} />}
            {q.quotation_agreed_at && <DocChip label="agreed" on tone="green" />}
            {q.contract_status && q.contract_status !== "none" && <DocChip label={`contract ${q.contract_status}`} on={q.contract_status !== "draft"} />}
            {q.invoice_status && q.invoice_status !== "none" && <DocChip label={`invoice ${q.invoice_status}`} on={q.invoice_status !== "draft"} />}
          </div>
          <p style={{ margin: "8px 0 0", color: "#6c675f", fontSize: 12 }}>{fmtDate(q.created_at)}</p>
        </div>
      </div>

      <WorkflowSection title="1. Client profile">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
          <IdPill label="Client ID" value={clientId} strong />
          <IdPill label="Name" value={q.name || "Not provided"} />
          <IdPill label="Mobile" value={q.phone || "Not provided"} />
          <IdPill label="Email" value={q.email} />
          {q.company && <IdPill label="Company" value={q.company} />}
          <IdPill label={rental ? "Rental order ID" : "Request ID"} value={rental ? rentalOrderId : q.id} strong={rental} />
          {q.order_no && <IdPill label="System order no" value={q.order_no} />}
        </div>
        <TechnicalRefs q={q} paymentDisplayId={paymentDisplayId} rentalOrderId={rentalOrderId} />
      </WorkflowSection>

      <WorkflowSection title="2. Equipment rented">
        <div style={{ display: "grid", gap: 7 }}>
          {q.items.map((item, idx) => (
            <EngagementLine key={`${q.id}-${item.id ?? idx}`} item={item} offer={packageForLine(item, packages)} />
          ))}
        </div>
      </WorkflowSection>

      <WorkflowSection title="3. Money">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
          <IdPill label={rental ? "Order total" : "Reference total"} value={formatPHP(total)} strong />
          <IdPill label="Initial payment" value={formatPHP(paid)} strong={paid > 0} />
          <IdPill label="Remaining balance" value={formatPHP(remaining)} strong={remaining > 0} />
          {discount > 0 && <IdPill label="Discounts" value={`-${formatPHP(discount)}`} />}
          {(q.payment_ref || q.invoice) && <IdPill label="Payment ID" value={paymentDisplayId} strong />}
          <IdPill label="Mode of payment" value={paymentMethodLabel(q.payment_method ?? null)} />
          {q.paid_at && <IdPill label="Payment date" value={fmtDate(q.paid_at)} />}
          {q.balance_method && <IdPill label="Settlement type" value={q.balance_method} />}
          {q.client_location && <IdPill label="Payment location" value={`${q.client_location}${q.client_ip ? ` / ${q.client_ip}` : ""}`} />}
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => on.openInvoice(q)} style={cardBtnPrimary}><Receipt size={14} /> Generate / review invoice</button>
        </div>
      </WorkflowSection>

      {q.cancel_status === "requested" && q.fulfillment_status !== "cancelled" && (
        <WorkflowSection title="4. Cancellation / refund request" tone="warning">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
            <IdPill label="Request ID" value={q.id} strong />
            {reasonId && <IdPill label="Reason ID" value={reasonId} strong />}
            {q.cancel_reason_category && <IdPill label="Reason category" value={q.cancel_reason_category} />}
          </div>
          {q.cancel_reason && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#3a362f", whiteSpace: "pre-wrap" }}>{q.cancel_reason}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={() => on.openCancel(q)} disabled={updating === q.id} style={cardBtnGreen}><PackageCheck size={14} /> Generate credit memo / refund</button>
            <button onClick={() => on.declineCancel(q.id)} disabled={updating === q.id} style={cardBtnText}>Decline</button>
          </div>
        </WorkflowSection>
      )}

      <WorkflowSection title={q.cancel_status === "requested" && q.fulfillment_status !== "cancelled" ? "5. Documents to build" : "4. Documents to build"}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {!rental && (
            <button onClick={() => on.openQuotation(q)} style={cardBtnPrimary}>
              <FileText size={14} /> {q.quotation_status && q.quotation_status !== "none" ? "Edit quotation" : "Build quotation"}
            </button>
          )}
          {isQuoteRequest(q) && q.quotation_status && q.quotation_status !== "none" && !q.quotation_agreed_at && (
            <button onClick={() => on.setAgreed(q.id, true)} disabled={updating === q.id} style={cardBtnGreen}>
              <PackageCheck size={14} /> Mark quotation agreed
            </button>
          )}
          {(rental || q.quotation_agreed_at) && (
            <>
              <button onClick={() => on.openContract(q)} style={rental ? cardBtnPrimary : cardBtnGhost}>
                <ScrollText size={14} /> {q.contract_status === "sent" ? "Edit sent contract" : q.contract_status && q.contract_status !== "none" ? "Review contract draft" : "Build contract"}
              </button>
              <button onClick={() => on.openInvoice(q)} style={cardBtnGhost}>
                <Receipt size={14} /> {q.invoice_status === "sent" ? "Edit sent invoice" : q.invoice_status && q.invoice_status !== "none" ? "Review invoice draft" : "Build invoice"}
              </button>
            </>
          )}
          {rental && (
            <button onClick={() => on.openQuotation(q)} style={cardBtnText}>Source pricing</button>
          )}
        </div>
      </WorkflowSection>

      <WorkflowSection title={q.cancel_status === "requested" && q.fulfillment_status !== "cancelled" ? "6. Email send queue" : "5. Email send queue"}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableAttachments.map((a) => (
              <label key={a.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: a.enabled ? "#fffdf8" : "#f0ece3", color: a.enabled ? "#15130f" : "#8a8378", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 8, padding: "6px 9px" }}>
                <input type="checkbox" checked={emailAttachments.includes(a.key)} onChange={() => toggleAttachment(a.key)} disabled={!a.enabled} /> {a.label}
              </label>
            ))}
          </div>
          <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={2} placeholder="Optional email note..." style={{ ...editInput, resize: "vertical" }} />
          {emailNotice && <p style={{ margin: 0, color: "#2f6b46", fontSize: 12.5 }}>{emailNotice}</p>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => void sendQueuedEmail()} disabled={emailBusy || emailAttachments.length === 0} style={{ ...cardBtnPrimary, opacity: emailBusy || emailAttachments.length === 0 ? 0.6 : 1 }}>
              {emailBusy ? <Loader2 size={14} className="spin" /> : <Mail size={14} />} Email
            </button>
            <a href={`mailto:${q.email}?subject=${encodeURIComponent(`VissionLink ${rental ? "rental order" : "quotation"} - ${rental ? rentalOrderId : q.id}`)}`} style={{ ...cardBtnGhost, textDecoration: "none" }}>
              <Mail size={14} /> Manual reply
            </a>
          </div>
        </div>
      </WorkflowSection>

      {q.fulfillment_status && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(17,17,17,0.14)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#8a8378", textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 4 }}><Truck size={13} />Fulfillment</span>
          <DocChip label={q.fulfillment_status.replace("_", " ")} on={q.fulfillment_status === "settled"} tone={q.fulfillment_status === "settled" ? "green" : undefined} />
          {q.delivery_address && <span style={{ fontSize: 12, color: "#6c675f", display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {q.delivery_address}</span>}
          {q.fulfillment_status === "paid" && (
            <button onClick={() => on.setFulfillment(q.id, "shipped")} disabled={updating === q.id} style={{ ...cardBtnGhost, opacity: updating === q.id ? 0.6 : 1 }}><Truck size={14} /> Mark shipped</button>
          )}
          {q.fulfillment_status === "shipped" && (
            <button onClick={() => on.setFulfillment(q.id, "returned")} disabled={updating === q.id} style={{ ...cardBtnGhost, opacity: updating === q.id ? 0.6 : 1 }}><CornerUpLeft size={14} /> Mark returned</button>
          )}
          {q.fulfillment_status === "returned" && (
            <button onClick={() => { if (confirm("Settle this rental? Record any damage charges on the invoice first (the deposit absorbs them); the remaining deposit is then refunded off-app.")) void on.setFulfillment(q.id, "settled"); }} disabled={updating === q.id} style={{ ...cardBtnGreen, opacity: updating === q.id ? 0.6 : 1 }}><PackageCheck size={14} /> Settle</button>
          )}
          {["paid", "shipped", "returned"].includes(q.fulfillment_status) && (
            <button onClick={() => on.openCancel(q)} disabled={updating === q.id} style={{ ...cardBtnText, color: "#c0392b" }}><X size={13} /> Cancel / refund</button>
          )}
          {q.fulfillment_status === "cancelled" && (
            <span style={{ fontSize: 12, color: "#8a4b00" }}>
              Cancelled{q.refund_amount != null ? ` · refunded ${formatPHP(Number(q.refund_amount) || 0)}${q.refund_method === "offline" ? " (manual)" : ""}` : ""}{q.credit_memo_no ? ` · ${q.credit_memo_no}` : ""}
            </span>
          )}
        </div>
      )}

      {q.notes && (
        <p style={{ margin: "12px 0 0", color: "#3a362f", background: "#f0ece3", padding: 10, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {q.notes}
        </p>
      )}
    </article>
  );
}

function IdPill({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 9, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ color: "#8a8378", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div title={value} style={{ color: "#15130f", fontSize: 12.5, fontWeight: strong ? 800 : 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function TechnicalRefs({ q, rentalOrderId, paymentDisplayId }: { q: QuoteRequest; rentalOrderId: string; paymentDisplayId: string }) {
  const rows = [
    ["Display order", rentalOrderId],
    ["Display payment", paymentDisplayId],
    ["Database row", q.id],
    q.order_no ? ["Legacy order no", q.order_no] : null,
    q.payment_ref ? ["Gateway ref", q.payment_ref] : null,
    q.payment_method ? ["Gateway method", paymentMethodLabel(q.payment_method)] : null,
  ].filter(Boolean) as string[][];
  return (
    <details style={{ marginTop: 10, color: "#6c675f", fontSize: 11.5 }}>
      <summary style={{ cursor: "pointer", fontWeight: 800, color: "#3a362f" }}>Technical refs</summary>
      <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 8 }}>
            <span>{label}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={value}>{value}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function WorkflowSection({ title, children, tone }: { title: string; children: ReactNode; tone?: "warning" }) {
  return (
    <section style={{ marginTop: 16, paddingTop: 14, borderTop: "2px solid rgba(17,17,17,0.18)" }}>
      <h4 style={{ margin: "0 0 9px", color: tone === "warning" ? "#8a5a00" : "#8a8378", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h4>
      <div style={{ background: tone === "warning" ? "#fff6e9" : "transparent", border: tone === "warning" ? "1px solid #f0c980" : "none", borderRadius: tone === "warning" ? 10 : 0, padding: tone === "warning" ? 12 : 0 }}>
        {children}
      </div>
    </section>
  );
}

function EngagementLine({ item, offer }: { item: QuoteItem; offer: PackageOffer | null }) {
  const rawId = item.id ?? item.slug ?? "";
  const isPackage = Boolean(offer) || rawId.startsWith("pkg-") || item.type === "package";
  const displayId = offer?.id ?? (rawId.startsWith("pkg-") ? rawId.slice(4) : rawId);
  const attached = offer ? [...offer.inclusions, ...offer.relatedItemSlugs.map((slug) => `Catalog: ${slug}`)] : [];
  return (
    <div style={{ display: "grid", gap: 5, color: "#15130f", fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10 }}>
        <span style={{ minWidth: 0 }}>
          <strong>{item.name || offer?.name || item.slug || item.id || "Item"}</strong>
          {isPackage && <span style={{ marginLeft: 7, color: "#2f6b46", fontSize: 11, fontWeight: 800 }}>package</span>}
        </span>
        <span style={{ color: "#6c675f", whiteSpace: "nowrap" }}>{item.qty ?? 1} x {item.days ?? 1} day(s)</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#6c675f", fontSize: 11.5 }}>
        {displayId && <span>{isPackage ? "Package ID" : "Item ID"}: <strong>{displayId}</strong></span>}
        {item.ratePerDay != null && <span>Rate: {formatPHP(Number(item.ratePerDay) || 0)}/day</span>}
        {offer?.slug && <span>Slug: {offer.slug}</span>}
      </div>
      {(attached.length > 0 || offer?.details.length || offer?.reviewNotes.length) && (
        <details style={{ color: "#6c675f", fontSize: 11.5, lineHeight: 1.45 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, color: "#3a362f" }}>More details / inclusions</summary>
          {attached.length > 0 && <p style={{ margin: "6px 0 0" }}><strong>Attached:</strong> {attached.join(" / ")}</p>}
          {offer?.details.length ? <p style={{ margin: "6px 0 0" }}><strong>Details:</strong> {offer.details.join(" / ")}</p> : null}
          {offer?.reviewNotes.length ? <p style={{ margin: "6px 0 0" }}><strong>Admin notes:</strong> {offer.reviewNotes.join(" / ")}</p> : null}
        </details>
      )}
    </div>
  );
}

// ─── Clients & Orders — one client-centric workspace ──────────────────────────
// Merges Orders + E-Quotations + E-Contracts + Invoicing + Clients. Leads with the
// client; expand to see all their engagements (quote request / order with
// contract+invoice / cancellation) and act on every document in place.
type RosterClient = {
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  ledger: ClientRow | null; // loyalty/standing record, when one exists
  engagements: QuoteRequest[]; // newest first
  lastActivity: number;
};

const CHIPS = [
  { key: "all", label: "All" },
  { key: "quote", label: "Quote requests" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "ship", label: "To ship" },
  { key: "out", label: "Out" },
  { key: "settle", label: "To settle" },
  { key: "cancel", label: "Cancellation requests" },
] as const;
type ChipKey = (typeof CHIPS)[number]["key"];

function engagementMatches(q: QuoteRequest, chip: ChipKey): boolean {
  switch (chip) {
    case "quote": return !q.fulfillment_status && q.status !== "closed";
    case "awaiting": return q.fulfillment_status === "pending_payment" || q.fulfillment_status === "processing";
    case "ship": return q.fulfillment_status === "paid";
    case "out": return q.fulfillment_status === "shipped";
    case "settle": return q.fulfillment_status === "returned";
    case "cancel": return q.cancel_status === "requested" && q.fulfillment_status !== "cancelled";
    default: return true;
  }
}

function ClientsOrdersPanel({ authCode }: { authCode: string }) {
  const { packages } = useStore();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [building, setBuilding] = useState<QuoteRequest | null>(null);
  const [buildingContract, setBuildingContract] = useState<QuoteRequest | null>(null);
  const [buildingInvoice, setBuildingInvoice] = useState<QuoteRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<QuoteRequest | null>(null);
  const [addingClient, setAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState<string | null>(null); // prefill "new quotation" for a client
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<ChipKey>("all");
  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [qr, cr] = await Promise.all([
        fetch("/api/admin/quotes", { headers: headers() }),
        fetch("/api/admin/clients", { headers: headers() }),
      ]);
      const qd = await qr.json(); const cd = await cr.json();
      if (!qr.ok) throw new Error(qd.error || "Could not load orders.");
      setQuotes(Array.isArray(qd) ? qd : []);
      setClients(Array.isArray(cd) ? cd : []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load."); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  // ── Engagement (quote_requests) handlers ────────────────────────────────────
  const patchQuote = async (id: string, body: Record<string, unknown>, optimistic: (q: QuoteRequest) => QuoteRequest) => {
    setUpdating(id); setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update.");
      setQuotes((prev) => prev.map((q) => (q.id === id ? optimistic(q) : q)));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update."); }
    finally { setUpdating(null); }
  };
  const setAgreed = (id: string, agreed: boolean) => patchQuote(id, { agreed }, (q) => ({ ...q, quotation_agreed_at: agreed ? new Date().toISOString() : null }));
  const setStatus = (id: string, status: QuoteRequest["status"]) => patchQuote(id, { status }, (q) => ({ ...q, status }));
  const setFulfillment = (id: string, fulfillment: string) => patchQuote(id, { fulfillment }, (q) => ({ ...q, fulfillment_status: fulfillment as QuoteRequest["fulfillment_status"] }));
  const deleteQuote = async (q: QuoteRequest) => {
    if (!confirm(`Delete the request from ${q.name}? This removes its quotation, contract, invoice and stored PDFs. This cannot be undone.`)) return;
    setUpdating(q.id); setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(q.id)}`, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not delete request.");
      setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete request."); }
    finally { setUpdating(null); }
  };
  const declineCancel = async (id: string) => {
    const note = prompt("Optional note to the client explaining the decision (they'll receive it by email):") ?? "";
    setUpdating(id); setError("");
    try {
      const res = await fetch("/api/admin/cancellations", { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ orderId: id, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not decline.");
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, cancel_status: "declined", cancel_admin_note: note } : q)));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not decline."); }
    finally { setUpdating(null); }
  };
  const emailDocuments = async (q: QuoteRequest, attachments: DocAttachment[], message: string) => {
    setUpdating(q.id); setError("");
    try {
      const res = await fetch("/api/admin/documents/email", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: q.id, attachments, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not email documents.");
      setQuotes((prev) => prev.map((row) => {
        if (row.id !== q.id) return row;
        return {
          ...row,
          ...(attachments.includes("quotation") ? { quotation_status: "sent" as const, status: "responded" as const } : {}),
          ...(attachments.includes("contract") ? { contract_status: "sent" as const } : {}),
          ...(attachments.includes("invoice") ? { invoice_status: "sent" as const } : {}),
        };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not email documents.");
      throw err;
    } finally {
      setUpdating(null);
    }
  };

  const on: EngagementHandlers = {
    openQuotation: setBuilding, openContract: setBuildingContract, openInvoice: setBuildingInvoice, openCancel: setCancelling,
    setStatus, setAgreed, setFulfillment, deleteQuote, declineCancel, emailDocuments,
  };

  // ── Client ledger handlers ──────────────────────────────────────────────────
  const actClient = async (email: string, body: Record<string, unknown>) => {
    setUpdating(email); setError("");
    try {
      const res = await fetch(`/api/admin/clients?email=${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update.");
      setClients((prev) => prev.map((c) => (c.email === email ? { ...c, ...data.client, policy: data.policy } : c)));
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update."); return false; }
    finally { setUpdating(null); }
  };
  const createClient = async (form: ClientFormValues) => {
    setUpdating("__new__"); setError("");
    try {
      const res = await fetch("/api/admin/clients", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not add client.");
      setClients((prev) => [{ ...data.client, policy: data.policy }, ...prev]);
      setAddingClient(false);
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not add client."); return false; }
    finally { setUpdating(null); }
  };
  const removeClient = async (email: string) => {
    if (!confirm(`Delete ${email} from the client ledger? (Their orders are kept; only the loyalty/standing record is removed.)`)) return;
    setUpdating(email); setError("");
    try {
      const res = await fetch(`/api/admin/clients?email=${encodeURIComponent(email)}`, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not delete client.");
      setClients((prev) => prev.filter((c) => c.email !== email));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete client."); }
    finally { setUpdating(null); }
  };

  // ── Build the roster (ledger ∪ engagements, grouped by email) ───────────────
  const roster = useMemo<RosterClient[]>(() => {
    const map = new Map<string, RosterClient>();
    for (const c of clients) {
      const key = c.email.toLowerCase();
      map.set(key, { email: c.email, name: c.name ?? "", company: c.company, phone: c.phone, ledger: c, engagements: [], lastActivity: 0 });
    }
    for (const q of quotes) {
      const key = (q.email ?? "").toLowerCase();
      if (!key) continue;
      let e = map.get(key);
      if (!e) { e = { email: q.email, name: q.name ?? "", company: q.company, phone: q.phone, ledger: null, engagements: [], lastActivity: 0 }; map.set(key, e); }
      e.engagements.push(q);
      if (!e.name && q.name) e.name = q.name;
      if (!e.company && q.company) e.company = q.company;
      if (!e.phone && q.phone) e.phone = q.phone;
      const t = new Date(q.created_at).getTime() || 0;
      if (t > e.lastActivity) e.lastActivity = t;
    }
    const list = [...map.values()];
    for (const e of list) e.engagements.sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
    return list.sort((a, b) => b.lastActivity - a.lastActivity);
  }, [clients, quotes]);

  const metrics = useMemo(() => {
    const count = (chipKey: ChipKey) => quotes.filter((q) => engagementMatches(q, chipKey)).length;
    return { clients: roster.length, quote: count("quote"), awaiting: count("awaiting"), ship: count("ship"), settle: count("settle"), cancel: count("cancel") };
  }, [quotes, roster.length]);

  // Apply search + chip filter to the roster.
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return roster.filter((c) => {
      if (chip !== "all" && !c.engagements.some((q) => engagementMatches(q, chip))) return false;
      if (!term) return true;
      if (c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || (c.company ?? "").toLowerCase().includes(term) || crmIdFor(c.email).toLowerCase().includes(term)) return true;
      return c.engagements.some((q) => {
        const haystack = [
          q.id, q.order_no, q.payment_ref, q.payment_method, q.channel, q.fulfillment_status,
          rentalOrderIdFor(q), paymentDisplayIdFor(q),
          ...q.items.flatMap((item) => [item.id, item.slug, item.name]),
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(term);
      });
    });
  }, [roster, query, chip]);

  const isOpen = (email: string) => chip !== "all" || query.trim() !== "" || expanded.has(email);
  const toggle = (email: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(email)) n.delete(email); else n.add(email); return n; });
  const patchOne = (id: string, patch: Partial<QuoteRequest>) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <Metric label="Clients" value={String(metrics.clients)} />
        <Metric label="Quote requests" value={String(metrics.quote)} />
        <Metric label="Awaiting payment" value={String(metrics.awaiting)} />
        <Metric label="To ship" value={String(metrics.ship)} />
        <Metric label="To settle" value={String(metrics.settle)} />
        <Metric label="Cancellations" value={String(metrics.cancel)} />
      </div>

      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 22, margin: 0 }}>Clients &amp; Orders</h2>
            <p style={{ margin: "2px 0 0", color: "#6c675f", fontSize: 13 }}>Every client and their full history — quote requests, orders, contracts, invoices, cancellations — in one place.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => { setCreateEmail(null); setCreating(true); }} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}><Plus size={14} /> New quotation</button>
            <button onClick={() => { setAddingClient((a) => !a); }} style={miniBtn}><Users size={14} /> {addingClient ? "Close" : "Add client"}</button>
            <button onClick={load} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, company, or SO-…" style={{ ...editInput, maxWidth: 320 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CHIPS.map((c) => (
              <button key={c.key} onClick={() => setChip(c.key)} style={{ ...tinyBtn, background: chip === c.key ? "#15130f" : undefined, color: chip === c.key ? "#ffcc00" : undefined }}>{c.label}</button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}

        {addingClient && (
          <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 10px", fontSize: 17 }}>New off-platform client</h3>
            <ClientForm busy={updating === "__new__"} requireEmail onSubmit={createClient} onCancel={() => setAddingClient(false)} submitLabel="Add client" />
          </div>
        )}

        {!loading && filtered.length === 0 && <p style={{ color: "#6c675f", fontSize: 13 }}>No clients match. New quote requests and paid orders appear here automatically; or add an off-platform client above.</p>}

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((c) => {
            const open = isOpen(c.email);
            const needsAttention = c.engagements.some((q) => q.cancel_status === "requested" && q.fulfillment_status !== "cancelled") || c.engagements.some((q) => engagementMatches(q, "awaiting") || engagementMatches(q, "ship"));
            const orderCount = c.engagements.filter((q) => q.fulfillment_status).length;
            const quoteCount = c.engagements.filter((q) => !q.fulfillment_status).length;
            return (
              <article key={c.email} className="surface" style={{ padding: 0, border: "1px solid rgba(17,17,17,0.12)", overflow: "hidden" }}>
                <button onClick={() => toggle(c.email)} style={{ width: "100%", textAlign: "left", background: "#fffdf8", border: "none", borderBottom: open ? "1px solid rgba(17,17,17,0.1)" : "none", padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 17, fontWeight: 700, color: "#15130f", display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "#8a8378", fontSize: 13 }}>{open ? "▾" : "▸"}</span>
                      {c.name || c.email}
                      {needsAttention && <span style={{ width: 8, height: 8, borderRadius: 999, background: "#caa000" }} title="Needs attention" />}
                      {c.ledger && <DocChip label={c.ledger.policy.tierLabel} on />}
                      {c.ledger && <DocChip label={c.ledger.standing} on={c.ledger.standing !== "good"} tone={c.ledger.standing === "good" ? "green" : undefined} />}
                      {!c.ledger && <span style={{ fontSize: 11, color: "#8a8378", fontWeight: 600 }}>lead</span>}
                    </span>
                    <p style={{ margin: "3px 0 0", color: "#6c675f", fontSize: 12.5 }}>{crmIdFor(c.email)} · {c.email}{c.company ? ` · ${c.company}` : ""}{c.phone ? ` · ${c.phone}` : ""}</p>
                  </div>
                  <span style={{ color: "#6c675f", fontSize: 12, whiteSpace: "nowrap" }}>{orderCount} order(s) · {quoteCount} quote(s)</span>
                </button>

                {open && (
                  <div style={{ padding: 16, background: "#f7f5ef", display: "grid", gap: 12 }}>
                    {/* Ledger controls (when the client has a loyalty record). */}
                    {c.ledger && editingClient !== c.email && (
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 12.5, color: "#3a362f" }}>
                        <span>Loyalty: {Math.round(c.ledger.policy.loyaltyRate * 100)}% · deposit {Math.round(c.ledger.policy.depositRate * 100)}% · PDC {c.ledger.policy.pdcAllowed ? "yes" : "no"} · {c.ledger.clean_paid_count} clean · spent {formatPHP(Number(c.ledger.total_spent) || 0)}</span>
                        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {(["good", "watch", "blocked"] as const).map((s) => (
                            <button key={s} onClick={() => actClient(c.email, { standing: s })} disabled={updating === c.email || c.ledger!.standing === s} style={{ ...tinyBtn, opacity: updating === c.email || c.ledger!.standing === s ? 0.5 : 1 }}>{s}</button>
                          ))}
                          <button onClick={() => setEditingClient(c.email)} style={tinyBtn}><Pencil size={12} /> Edit</button>
                          <button onClick={() => { if (confirm("Record a LATE settlement? Demotes to watch and resets the loyalty streak.")) void actClient(c.email, { delinquency: "late" }); }} style={{ ...tinyBtn, color: "#c0392b" }}>+ late</button>
                          <button onClick={() => { if (confirm("Record a BOUNCED cheque? Demotes to watch and resets the loyalty streak.")) void actClient(c.email, { delinquency: "bounced" }); }} style={{ ...tinyBtn, color: "#c0392b" }}>+ bounced</button>
                          <button onClick={() => removeClient(c.email)} style={{ ...tinyBtn, color: "#c0392b" }} aria-label="Delete ledger record"><Trash2 size={12} /></button>
                        </span>
                      </div>
                    )}
                    {c.ledger && editingClient === c.email && (
                      <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 10, padding: 12 }}>
                        <ClientForm
                          busy={updating === c.email}
                          initial={{ email: c.email, name: c.name ?? "", company: c.company ?? "", phone: c.phone ?? "", standing: c.ledger.standing, notes: c.ledger.notes ?? "", clean_paid_count: String(c.ledger.clean_paid_count ?? 0), total_spent: String(c.ledger.total_spent ?? 0) }}
                          lockEmail submitLabel="Save changes"
                          onCancel={() => setEditingClient(null)}
                          onSubmit={async (f) => { const ok = await actClient(c.email, { name: f.name, company: f.company, phone: f.phone, standing: f.standing, notes: f.notes, clean_paid_count: Number(f.clean_paid_count) || 0, total_spent: Number(f.total_spent) || 0 }); if (ok) setEditingClient(null); return ok; }}
                        />
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8a8378", textTransform: "uppercase", letterSpacing: "0.05em" }}>Engagements</span>
                      <button onClick={() => { setCreateEmail(c.email); setCreating(true); }} style={tinyBtn}><Plus size={12} /> New quotation</button>
                    </div>
                    {c.engagements.length === 0 && <p style={{ color: "#6c675f", fontSize: 13, margin: 0 }}>No quote requests or orders yet for this client.</p>}
                    {c.engagements.map((q) => <EngagementCard key={q.id} q={q} updating={updating} on={on} packages={packages} />)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {creating && (
        <QuotationCreateForm
          authCode={authCode}
          kind="quotation"
          prefillEmail={createEmail}
          onClose={() => { setCreating(false); setCreateEmail(null); }}
          onCreated={(request) => { setCreating(false); setCreateEmail(null); setQuotes((prev) => [request, ...prev]); setBuilding(request); }}
        />
      )}
      {building && (
        <QuotationEditor
          request={building}
          authCode={authCode}
          onClose={() => setBuilding(null)}
          onSent={(id) => { patchOne(id, { status: "responded", quotation_status: "sent" }); setBuilding(null); }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, quotation_status: q.quotation_status === "sent" ? "sent" : "draft" } : q)))}
          onDiscarded={(id) => patchOne(id, { quotation_status: "none", quotation_sent_at: null })}
        />
      )}
      {buildingContract && (
        <ContractEditor
          request={buildingContract}
          authCode={authCode}
          onClose={() => setBuildingContract(null)}
          onSent={(id) => { patchOne(id, { contract_status: "sent" }); setBuildingContract(null); }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, contract_status: q.contract_status && q.contract_status !== "none" ? q.contract_status : "draft" } : q)))}
          onDiscarded={(id) => patchOne(id, { contract_status: "none" })}
        />
      )}
      {buildingInvoice && (
        <InvoiceEditor
          request={buildingInvoice}
          authCode={authCode}
          onClose={() => setBuildingInvoice(null)}
          onSent={(id) => { patchOne(id, { invoice_status: "sent" }); setBuildingInvoice(null); }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, invoice_status: q.invoice_status && q.invoice_status !== "none" ? q.invoice_status : "draft" } : q)))}
          onDiscarded={(id) => patchOne(id, { invoice_status: "none" })}
        />
      )}
      {cancelling && (
        <CancelRefundModal
          request={cancelling}
          authCode={authCode}
          onClose={() => setCancelling(null)}
          onDone={(id, patch) => { patchOne(id, patch); setCancelling(null); }}
        />
      )}
    </div>
  );
}

function CancelRefundModal({
  request,
  authCode,
  onClose,
  onDone,
}: {
  request: QuoteRequest;
  authCode: string;
  onClose: () => void;
  onDone: (id: string, patch: Partial<QuoteRequest>) => void;
}) {
  const amountPaid = Math.max(0, Number(request.amount_paid ?? request.est_total) || 0);
  const [reasonCategory, setReasonCategory] = useState(request.cancel_reason_category || REASON_CATEGORIES[0]);
  const [reason, setReason] = useState(request.cancel_reason || "");
  const [refundAmount, setRefundAmount] = useState(String(amountPaid));
  const [note, setNote] = useState(request.cancel_admin_note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    const reasonText = reason.trim();
    const refund = Math.min(Math.max(0, Number(refundAmount) || 0), amountPaid);
    if (reasonText.length < MIN_REASON_LEN) {
      setError(`Reason must be at least ${MIN_REASON_LEN} characters.`);
      return;
    }
    if (!confirm(`Approve cancellation for ${displayRentalOrderId(request.id, request.order_no)} and refund ${formatPHP(refund)}?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cancellations", {
        method: "POST",
        headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: request.id, reasonCategory, reason: reasonText, refundAmount: refund, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not complete cancellation.");
      onDone(request.id, {
        fulfillment_status: "cancelled",
        cancel_status: refund > 0 ? "refunded" : "cancelled",
        cancel_reason_category: reasonCategory,
        cancel_reason: reasonText,
        cancel_admin_note: note,
        refund_amount: data.refundAmount ?? refund,
        refund_method: data.refundMethod ?? "offline",
        credit_memo_no: data.creditMemoNo ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete cancellation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DocModal title={`Cancel / refund ${displayRentalOrderId(request.id, request.order_no)}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#6c675f", fontSize: 13 }}>
          Approving cancels the rental, releases any held units, records the refund, generates a credit memo, and emails the client.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
          <LabeledField label="Reason category">
            <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)} style={editInput}>
              {REASON_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </LabeledField>
          <LabeledField label={`Refund amount (max ${formatPHP(amountPaid)})`}>
            <input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} style={editInput} inputMode="decimal" />
          </LabeledField>
        </div>
        <LabeledField label={`Reason (${MIN_REASON_LEN}+ chars)`}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} style={{ ...editInput, resize: "vertical" }} />
        </LabeledField>
        <LabeledField label="Admin note to client">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...editInput, resize: "vertical" }} />
        </LabeledField>
        {error && <p style={{ margin: 0, color: "#c0392b", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onClose} disabled={busy} style={miniBtn}>Close</button>
          <button onClick={approve} disabled={busy} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>
            {busy ? <Loader2 size={14} className="spin" /> : <CornerUpLeft size={14} />} Approve cancellation
          </button>
        </div>
      </div>
    </DocModal>
  );
}

function QuotationCreateForm({
  authCode,
  kind = "quotation",
  prefillEmail = null,
  onClose,
  onCreated,
}: {
  authCode: string;
  kind?: "quotation" | "contract" | "invoice";
  prefillEmail?: string | null;
  onClose: () => void;
  onCreated: (request: QuoteRequest) => void;
}) {
  const { packages } = useStore();
  const [form, setForm] = useState({ name: "", email: prefillEmail ?? "", company: "", phone: "", project: "", dateFrom: "", dateTo: "", notes: "", packageSlug: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError("Client name and email are required."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not create quotation.");
      onCreated(data.request as QuoteRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quotation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,9,7,0.55)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={{ width: "100%", maxWidth: 560, background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 24, margin: 0 }}>New {kind}</h2>
          <button onClick={onClose} style={{ ...tinyBtn, padding: 6, borderRadius: 999 }} aria-label="Close"><X size={16} /></button>
        </div>
        <p style={{ margin: "0 0 14px", color: "#6c675f", fontSize: 13 }}>
          For an order that didn&apos;t come through the site (call / walk-in client). Pick a package to pre-fill lines, then review &amp; {kind === "quotation" ? "sign" : `build the ${kind}`} in the next step.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <LabeledField label="Package (optional — pre-fills equipment lines)">
            <select value={form.packageSlug} onChange={(e) => set("packageSlug", e.target.value)} style={editInput}>
              <option value="">No package — start blank</option>
              {packages.map((o) => (
                <option key={o.slug} value={o.slug}>{o.name} ({o.priceRange})</option>
              ))}
            </select>
          </LabeledField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <LabeledField label="Client name *"><input value={form.name} onChange={(e) => set("name", e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Client email *"><input value={form.email} onChange={(e) => set("email", e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Company"><input value={form.company} onChange={(e) => set("company", e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Project"><input value={form.project} onChange={(e) => set("project", e.target.value)} style={editInput} /></LabeledField>
            <div />
            <LabeledField label="Shoot from"><input type="date" value={form.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Shoot to"><input type="date" value={form.dateTo} onChange={(e) => set("dateTo", e.target.value)} style={editInput} /></LabeledField>
          </div>
          <LabeledField label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>

          {error && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={miniBtn}>Cancel</button>
            <button onClick={create} disabled={busy} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>
              {busy ? <Loader2 size={14} className="spin" /> : <FileText size={14} />} {kind === "quotation" ? "Generate & review" : `Create & build ${kind}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quotation editor ─────────────────────────────────────────────────────────
// Loads a draft (auto-built from the request) or the saved quotation, lets the
// admin edit line items, totals, and notes, capture an e-signature, then Save or
// Send. Send renders the PDF server-side, stores a copy, and emails the client.
function QuotationEditor({
  request,
  authCode,
  onClose,
  onSent,
  onSaved,
  onDiscarded,
}: {
  request: QuoteRequest;
  authCode: string;
  onClose: () => void;
  onSent: (id: string) => void;
  onSaved: (id: string) => void;
  onDiscarded: (id: string) => void;
}) {
  const [doc, setDoc] = useState<QuotationDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"save" | "send" | "preview" | null>(null);
  const [notice, setNotice] = useState("");
  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load quotation.");
        // Backfill fields that older drafts may predate.
        const raw = data.doc as QuotationDoc;
        if (alive) setDoc({ ...raw, laborLines: raw.laborLines ?? [], specialDiscountRate: raw.specialDiscountRate ?? 0, paymentTerms: raw.paymentTerms ?? "" });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not load quotation.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [request.id, headers]);

  const totals = useMemo(() => (doc ? computeTotals(doc) : null), [doc]);

  const patch = (p: Partial<QuotationDoc>) => setDoc((d) => (d ? { ...d, ...p } : d));

  // Line helpers parameterized by which band they edit: "lines" (equipment) or
  // "laborLines" (crew). `days` carries over from the equipment rental days.
  type Band = "lines" | "laborLines";
  const newId = (n: number) => `ln-${Date.now().toString(36)}-${n}`;
  const patchLine = (band: Band, id: string, p: Partial<QuotationLine>) =>
    setDoc((d) => (d ? { ...d, [band]: d[band].map((l) => (l.id === id ? { ...l, ...p } : l)) } : d));
  const addLine = (band: Band, preset?: Partial<QuotationLine>) =>
    setDoc((d) => {
      if (!d) return d;
      const days = d.lines[0]?.days ?? 1;
      const line: QuotationLine = { id: newId(d[band].length), description: "", qty: 1, days, unitRate: 0, ...preset };
      return { ...d, [band]: [...d[band], line] };
    });
  const removeLine = (band: Band, id: string) =>
    setDoc((d) => (d ? { ...d, [band]: d[band].filter((l) => l.id !== id) } : d));

  const save = async () => {
    if (!doc) return;
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not save.");
      setNotice("Draft saved.");
      onSaved(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    if (!doc) return;
    // Open the tab synchronously inside the click so the browser keeps it within
    // the user gesture (a window.open after `await` gets popup-blocked).
    const win = window.open("", "_blank");
    setBusy("preview");
    setError("");
    try {
      // Save first so the PDF reflects current edits, then open it.
      await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}`, {
        method: "PUT",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const res = await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}&format=pdf`, { headers: headers() });
      if (!res.ok) throw new Error(await pdfErr(res));
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url;
      else downloadBlobUrl(url, `${doc.number}.pdf`); // popup blocked — download instead
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (win) win.close();
      setError(err instanceof Error ? err.message : "Could not render PDF preview.");
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    if (!doc) return;
    if (!confirm(`Discard quotation ${doc.number}? The draft and its stored PDF are deleted; a fresh draft is rebuilt next time you open it.`)) return;
    setBusy("save");
    setError("");
    try {
      const res = await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}`, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not discard.");
      onDiscarded(request.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,9,7,0.55)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={{ width: "100%", maxWidth: 760, background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 24, margin: 0 }}>Quotation{doc ? ` · ${doc.number}` : ""}</h2>
          <button onClick={onClose} style={{ ...tinyBtn, padding: 6, borderRadius: 999 }} aria-label="Close"><X size={16} /></button>
        </div>

        {loading && <p style={{ color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Loader2 size={14} className="spin" /> Building draft…</p>}
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}

        {doc && totals && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Client + dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <LabeledField label="Client name"><input value={doc.client.name} onChange={(e) => patch({ client: { ...doc.client, name: e.target.value } })} style={editInput} /></LabeledField>
              <LabeledField label="Client email"><input value={doc.client.email} onChange={(e) => patch({ client: { ...doc.client, email: e.target.value } })} style={editInput} /></LabeledField>
              <LabeledField label="Company"><input value={doc.client.company} onChange={(e) => patch({ client: { ...doc.client, company: e.target.value } })} style={editInput} /></LabeledField>
              <LabeledField label="Project"><input value={doc.client.project} onChange={(e) => patch({ client: { ...doc.client, project: e.target.value } })} style={editInput} /></LabeledField>
              <LabeledField label="Issue date"><input type="date" value={doc.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} style={editInput} /></LabeledField>
              <LabeledField label="Valid until"><input type="date" value={doc.validUntil} onChange={(e) => patch({ validUntil: e.target.value })} style={editInput} /></LabeledField>
            </div>

            {/* Equipment line items */}
            <LineBand
              title="Equipment"
              lines={doc.lines}
              picker={{ label: "+ Add from rate card…", options: RATE_CARD.map((r) => ({ value: r.key, label: `${r.name} — ${formatPHP(r.dailyRate)}`, description: r.name, unitRate: r.dailyRate })) }}
              onAdd={(preset) => addLine("lines", preset)}
              onPatch={(id, p) => patchLine("lines", id, p)}
              onRemove={(id) => removeLine("lines", id)}
            />

            {/* Labor / personnel */}
            <LineBand
              title="Labor / Personnel"
              lines={doc.laborLines}
              picker={{ label: "+ Add crew…", options: PERSONNEL_RATES.map((r) => ({ value: r.key, label: `${r.name} — ${formatPHP(r.dailyRate)}`, description: r.name, unitRate: r.dailyRate })) }}
              onAdd={(preset) => addLine("laborLines", preset)}
              onPatch={(id, p) => patchLine("laborLines", id, p)}
              onRemove={(id) => removeLine("laborLines", id)}
            />

            {/* Adjustments + totals */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={doc.applySurcharge} onChange={(e) => patch({ applySurcharge: e.target.checked })} />
                  Out-of-town surcharge ({Math.round(doc.surchargeRate * 100)}%)
                </label>
                <LabeledField label="Special discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.specialDiscountRate * 100)} onChange={(e) => patch({ specialDiscountRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 })} style={editInput} /></LabeledField>
                <LabeledField label="Payment terms"><textarea value={doc.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>
              </div>
              <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 5, alignContent: "start" }}>
                {doc.laborLines.length > 0 && <Row label="Equipment cost" value={formatPHP(totals.equipmentSubtotal)} />}
                {doc.laborLines.length > 0 && <Row label="Labor cost" value={formatPHP(totals.laborSubtotal)} />}
                {doc.applySurcharge && <Row label={`Surcharge (${Math.round(doc.surchargeRate * 100)}%)`} value={formatPHP(totals.surcharge)} />}
                <Row label="Subtotal" value={formatPHP(totals.subtotal)} />
                {totals.discount > 0 && <Row label={`Special discount (${Math.round(doc.specialDiscountRate * 100)}%)`} value={"- " + formatPHP(totals.discount)} />}
                <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "4px 0" }} />
                <Row label="GRAND TOTAL" value={formatPHP(totals.total)} bold />
              </div>
            </div>

            <LabeledField label="Notes (shown on the quotation)"><textarea value={doc.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>

            {/* Signature */}
            <div>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Provider e-signature</span>
              <SignaturePad value={doc.signatureDataUrl} onChange={(dataUrl) => patch({ signatureDataUrl: dataUrl })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                <LabeledField label="Signed by"><input value={doc.signedBy} onChange={(e) => patch({ signedBy: e.target.value })} placeholder="Benito M. Remulta Jr." style={editInput} /></LabeledField>
                <LabeledField label="Signed date"><input type="date" value={doc.signedDate} onChange={(e) => patch({ signedDate: e.target.value })} style={editInput} /></LabeledField>
              </div>
            </div>

            {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={discard} disabled={busy !== null} style={{ ...miniBtn, color: "#c0392b", marginRight: "auto", opacity: busy ? 0.6 : 1 }} title="Delete this draft and its stored PDF">
                <Trash2 size={14} /> Discard
              </button>
              <button onClick={preview} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }} title="Opens the PDF in a new tab — print or save from there">
                {busy === "preview" ? <Loader2 size={14} className="spin" /> : <Eye size={14} />} Preview / Print PDF
              </button>
              <button onClick={save} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }}>
                {busy === "save" ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#6c675f", fontWeight: 700 }}>
      {label}
      {children}
    </label>
  );
}

// One editable band of quotation lines (equipment or labor) with a rate-card
// quick-add picker. Stateless — all mutations bubble up to the editor.
function LineBand({
  title,
  lines,
  picker,
  onAdd,
  onPatch,
  onRemove,
}: {
  title: string;
  lines: QuotationLine[];
  picker: { label: string; options: { value: string; label: string; description: string; unitRate: number }[] };
  onAdd: (preset?: Partial<QuotationLine>) => void;
  onPatch: (id: string, p: Partial<QuotationLine>) => void;
  onRemove: (id: string) => void;
}) {
  const cols = "1fr 52px 52px 92px 92px 26px";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: 13 }}>{title}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <select
            value=""
            onChange={(e) => {
              const opt = picker.options.find((o) => o.value === e.target.value);
              if (opt) onAdd({ description: opt.description, unitRate: opt.unitRate });
              e.target.value = "";
            }}
            style={{ ...editInput, width: "auto", maxWidth: 220, fontSize: 12, padding: "7px 9px" }}
          >
            <option value="">{picker.label}</option>
            {picker.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={() => onAdd()} style={{ ...tinyBtn, display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={13} /> Blank</button>
        </div>
      </div>
      {lines.length === 0 ? (
        <p style={{ color: "#9a948a", fontSize: 12, margin: "2px 2px 0" }}>None yet — add from the picker or a blank line.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, fontSize: 11, color: "#6c675f", fontWeight: 700, padding: "0 2px" }}>
            <span>Description</span><span style={{ textAlign: "right" }}>Qty</span><span style={{ textAlign: "right" }}>Days</span><span style={{ textAlign: "right" }}>Unit/day</span><span style={{ textAlign: "right" }}>Amount</span><span />
          </div>
          {lines.map((l) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center" }}>
              <input value={l.description} onChange={(e) => onPatch(l.id, { description: e.target.value })} placeholder="Description" style={editInput} />
              <input type="number" min={0} value={l.qty} onChange={(e) => onPatch(l.id, { qty: Number(e.target.value) })} style={{ ...editInput, textAlign: "right" }} />
              <input type="number" min={0} value={l.days} onChange={(e) => onPatch(l.id, { days: Number(e.target.value) })} style={{ ...editInput, textAlign: "right" }} />
              <input type="number" min={0} value={l.unitRate} onChange={(e) => onPatch(l.id, { unitRate: Number(e.target.value) })} style={{ ...editInput, textAlign: "right" }} />
              <span style={{ textAlign: "right", fontSize: 12, fontWeight: 700 }}>{formatPHP(lineAmount(l))}</span>
              <button onClick={() => onRemove(l.id)} style={{ ...tinyBtn, padding: 4, color: "#c0392b" }} aria-label="Remove line"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 13, color: "#15130f" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// Small lifecycle status pill used on the quote cards.
// Per-card visual identity by pipeline stage, so the list is scannable at a
// glance instead of a wall of identical cream cards. Most-advanced stage wins;
// "closed" always greys out. Colours stay within the site's muted palette.
type CardStage = { key: string; label: string; bar: string; tint: string; fg: string };
function cardStage(q: QuoteRequest): CardStage {
  const f = q.fulfillment_status;
  if (q.status === "closed") return { key: "closed", label: "Closed", bar: "#9a958b", tint: "#f5f4f0", fg: "#5b5750" };
  if (f === "settled") return { key: "settled", label: "Settled", bar: "#137a6a", tint: "#e9f5f2", fg: "#0f6657" };
  if (f === "returned") return { key: "returned", label: "Returned", bar: "#137a6a", tint: "#e9f5f2", fg: "#0f6657" };
  if (f === "shipped") return { key: "shipped", label: "Out — shipped", bar: "#137a6a", tint: "#e9f5f2", fg: "#0f6657" };
  if (f === "paid") return { key: "paid", label: "Paid", bar: "#137a6a", tint: "#e9f5f2", fg: "#0f6657" };
  if (f === "pending_payment") return { key: "unpaid", label: "Awaiting payment", bar: "#caa000", tint: "#fdf9ec", fg: "#7a5a00" };
  if (q.quotation_agreed_at || (q.contract_status && q.contract_status !== "none") || (q.invoice_status && q.invoice_status !== "none"))
    return { key: "agreed", label: "Agreed", bar: "#2f6b46", tint: "#eef4f0", fg: "#2f6b46" };
  if (q.quotation_status && q.quotation_status !== "none") return { key: "quoted", label: "Quoted", bar: "#3b6ea5", tint: "#eef3f9", fg: "#2f5b86" };
  return { key: "new", label: "New enquiry", bar: "#caa000", tint: "#fdf9ec", fg: "#7a5a00" };
}

function StageBadge({ stage }: { stage: CardStage }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "#fff", color: stage.fg, border: `1px solid ${stage.bar}`, padding: "3px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: stage.bar }} />
      {stage.label}
    </span>
  );
}

function DocChip({ label, on, tone }: { label: string; on?: boolean; tone?: "green" }) {
  // Formal outline chips with a status dot — readable without shouting.
  const s = tone === "green"
    ? { bg: "#eef4f0", fg: "#2f6b46", bd: "rgba(47,107,70,0.32)", dot: "#2f6b46" }
    : on
      ? { bg: "#fbf6e6", fg: "#7a5a00", bd: "rgba(180,140,0,0.38)", dot: "#caa000" }
      : { bg: "#f5f3ed", fg: "#8a8378", bd: "rgba(17,17,17,0.12)", dot: "#c4bdaf" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 999, background: s.bg, color: s.fg, border: `1px solid ${s.bd}`, padding: "3px 9px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// Pull a human-readable error out of a failed PDF response (the routes return
// JSON { error } on a render failure; fall back to a generic line otherwise).
async function pdfErr(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error as string;
  } catch { /* not JSON */ }
  return `Could not render the PDF (HTTP ${res.status}).`;
}

// Fallback when the preview tab is popup-blocked: download the PDF instead.
function downloadBlobUrl(blobUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Shared async lifecycle for a downstream document editor (contract / invoice):
// load draft-or-saved, save (PUT), preview/print (PUT then open PDF), send (POST).
// `normalize` backfills fields older drafts may predate.
function useDocEditor<T extends object>(endpoint: string, requestId: string, authCode: string, normalize: (raw: T) => T) {
  const [doc, setDoc] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"save" | "send" | "preview" | null>(null);
  const [notice, setNotice] = useState("");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);
  const url = `${endpoint}?requestId=${encodeURIComponent(requestId)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(url, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load.");
        if (alive) { setDoc(normalize(data.doc as T)); setMeta(data); }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Could not load.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const put = async () => {
    const res = await fetch(url, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ doc }) });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Could not save.");
    return data;
  };

  const save = async (onSaved?: () => void) => {
    if (!doc) return;
    setBusy("save"); setError(""); setNotice("");
    try { await put(); setNotice("Draft saved."); onSaved?.(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save."); }
    finally { setBusy(null); }
  };

  const preview = async () => {
    if (!doc) return;
    // Open synchronously (inside the click) to dodge the popup blocker.
    const win = window.open("", "_blank");
    setBusy("preview"); setError("");
    try {
      await put();
      const res = await fetch(`${url}&format=pdf`, { headers: headers() });
      if (!res.ok) throw new Error(await pdfErr(res));
      const blobUrl = URL.createObjectURL(await res.blob());
      if (win) win.location.href = blobUrl;
      else downloadBlobUrl(blobUrl, "document.pdf");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) { if (win) win.close(); setError(err instanceof Error ? err.message : "Could not render PDF."); }
    finally { setBusy(null); }
  };

  const send = async (message: string, onSent: () => void, onSkipped: () => void) => {
    if (!doc) return;
    setBusy("send"); setError(""); setNotice("");
    try {
      const res = await fetch(url, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ doc, message }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send.");
      if (data.emailSkipped) { setNotice("Saved and marked sent, but email is not configured — the client was not emailed."); onSkipped(); }
      else onSent();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send."); }
    finally { setBusy(null); }
  };

  // DELETE the saved doc (clears its columns server-side) so it can be rebuilt.
  const discard = async (onDone: () => void) => {
    setBusy("save"); setError(""); setNotice("");
    try {
      const res = await fetch(url, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not discard.");
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not discard."); }
    finally { setBusy(null); }
  };

  return { doc, setDoc, loading, error, busy, notice, meta, save, preview, send, discard };
}

// Modal shell shared by the contract & invoice editors.
function DocModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,9,7,0.55)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={{ width: "100%", maxWidth: 760, background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 24, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ ...tinyBtn, padding: 6, borderRadius: 999 }} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Action footer shared by contract & invoice editors.
function DocActions({ busy, onPreview, onSave, onDiscard }: { busy: "save" | "send" | "preview" | null; onPreview: () => void; onSave: () => void; onDiscard?: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {onDiscard && (
        <button onClick={onDiscard} disabled={busy !== null} style={{ ...miniBtn, color: "#c0392b", marginRight: "auto", opacity: busy ? 0.6 : 1 }} title="Delete this draft and its stored PDF">
          <Trash2 size={14} /> Discard
        </button>
      )}
      <button onClick={onPreview} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }} title="Opens the PDF in a new tab — print or save from there">
        {busy === "preview" ? <Loader2 size={14} className="spin" /> : <Eye size={14} />} Preview / Print PDF
      </button>
      <button onClick={onSave} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }}>
        {busy === "save" ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
      </button>
    </div>
  );
}

// ─── Clients ledger (loyalty + delinquency control) ───────────────────────────
type ClientRow = {
  email: string; name: string | null; company: string | null; phone: string | null;
  standing: "good" | "watch" | "blocked"; clean_paid_count: number; total_spent: number;
  bounced_count: number; late_count: number; notes: string | null;
  policy: ClientPolicy;
};

type TimelineOrder = {
  id: string; order_no: string | null; created_at: string; channel: string | null;
  status: string | null; project: string | null; date_from: string | null; date_to: string | null;
  est_total: number | string | null; items: QuoteItem[] | null;
  quotation_status: string | null; contract_status: string | null; contract_pdf_path: string | null;
  invoice_status: string | null; invoice_pdf_path: string | null;
  fulfillment_status: string | null; payment_method: string | null; payment_ref: string | null;
  amount_paid: number | string | null; paid_at: string | null;
  client_ip: string | null; client_location: string | null;
};

// Friendly label for the raw PayMongo method recorded on an order.
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: "GCash", paymaya: "Maya", grab_pay: "GrabPay", card: "Card", dob: "Online banking",
};
const paymentMethodLabel = (m: string | null) => (m ? PAYMENT_METHOD_LABELS[m] ?? m : "PayMongo");

type ClientFormValues = { email: string; name: string; company: string; phone: string; standing: "good" | "watch" | "blocked"; notes: string; clean_paid_count: string; total_spent: string };

function ClientForm({
  initial,
  busy,
  requireEmail,
  lockEmail,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ClientFormValues;
  busy: boolean;
  requireEmail?: boolean;
  lockEmail?: boolean;
  submitLabel: string;
  onSubmit: (values: ClientFormValues) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ClientFormValues>(initial ?? { email: "", name: "", company: "", phone: "", standing: "good", notes: "", clean_paid_count: "0", total_spent: "0" });
  const set = (k: keyof ClientFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 10 }}>
        <LabeledField label={requireEmail ? "Email *" : "Email"}><input value={form.email} onChange={(e) => set("email", e.target.value)} disabled={lockEmail} placeholder="client@email.com" style={{ ...editInput, opacity: lockEmail ? 0.6 : 1 }} /></LabeledField>
        <LabeledField label="Name"><input value={form.name} onChange={(e) => set("name", e.target.value)} style={editInput} /></LabeledField>
        <LabeledField label="Company"><input value={form.company} onChange={(e) => set("company", e.target.value)} style={editInput} /></LabeledField>
        <LabeledField label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={editInput} /></LabeledField>
        <LabeledField label="Standing">
          <select value={form.standing} onChange={(e) => set("standing", e.target.value)} style={editInput}>
            {(["good", "watch", "blocked"] as const).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </LabeledField>
        <LabeledField label="Clean rentals (history)"><input value={form.clean_paid_count} onChange={(e) => set("clean_paid_count", e.target.value)} style={editInput} /></LabeledField>
        <LabeledField label="Total spent (₱, history)"><input value={form.total_spent} onChange={(e) => set("total_spent", e.target.value)} style={editInput} /></LabeledField>
      </div>
      <LabeledField label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} style={editInput} /></LabeledField>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => void onSubmit(form)} disabled={busy || (requireEmail && !form.email.trim())} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy || (requireEmail && !form.email.trim()) ? 0.6 : 1 }}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />} {submitLabel}</button>
        <button onClick={onCancel} disabled={busy} style={miniBtn}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
type RentalRow = QuoteRequest & { invoice?: InvoiceDoc | null };

function useAuthList<T>(url: string, authCode: string): { data: T[]; loading: boolean; error: string; reload: () => void } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${authCode}` } });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not load.");
      setData(Array.isArray(j) ? j : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load."); }
    finally { setLoading(false); }
  }, [url, authCode]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

function DashboardPanel({ authCode, listingCount, setView }: { authCode: string; listingCount: number; setView: (v: AdminView) => void }) {
  const { data: rentals } = useAuthList<RentalRow>("/api/admin/quotes", authCode);
  const { data: clients } = useAuthList<{ email: string }>("/api/admin/clients", authCode);

  const m = useMemo(() => {
    let revenue = 0, receivables = 0, deposits = 0, invoicesOpen = 0;
    for (const r of rentals) {
      if (!r.invoice) continue;
      const money = computeInvoiceMoney(r.invoice);
      // Net of cancellations/refunds so the dashboard agrees with Accounting.
      const cancelled = r.fulfillment_status === "cancelled" || r.cancel_status === "refunded" || r.cancel_status === "cancelled";
      const refund = cancelled ? Math.min(Math.max(0, Number(r.refund_amount) || 0), money.paid) : 0;
      revenue += money.paid - refund;
      if (cancelled) continue; // a dead order has no open receivable, deposit, or open invoice
      receivables += money.balance; deposits += money.depositReceived;
      if (money.balance > 0.01) invoicesOpen++;
    }
    return {
      openRequests: rentals.filter((r) => r.status === "pending").length,
      quotationsSent: rentals.filter((r) => r.quotation_status === "sent").length,
      contracts: rentals.filter((r) => r.contract_status && r.contract_status !== "none").length,
      invoicesOpen, revenue, receivables, deposits,
    };
  }, [rentals]);

  const card = (label: string, value: string, to?: AdminView, accent?: boolean) => (
    <button onClick={() => to && setView(to)} style={{ textAlign: "left", cursor: to ? "pointer" : "default", background: accent ? "#15130f" : "#fffdf8", color: accent ? "#ffcc00" : "#15130f", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, color: accent ? "rgba(255,204,0,0.8)" : "#6c675f", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {card("Revenue collected", formatPHP(m.revenue), "accounting", true)}
        {card("Receivables outstanding", formatPHP(m.receivables), "clients-orders")}
        {card("Deposits held", formatPHP(m.deposits))}
        {card("Open requests", String(m.openRequests), "clients-orders")}
        {card("Quotations sent", String(m.quotationsSent), "clients-orders")}
        {card("Contracts", String(m.contracts), "clients-orders")}
        {card("Open invoices", String(m.invoicesOpen), "clients-orders")}
        {card("Clients", String(clients.length), "clients-orders")}
        {card("Live listings", String(listingCount))}
      </div>
      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 8px" }}>Quick start</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setView("clients-orders")} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}><ShoppingBag size={14} /> Clients & orders</button>
          <button onClick={() => setView("clients-orders")} style={miniBtn}><FileText size={14} /> Quotations & documents</button>
          <button onClick={() => setView("clients-orders")} style={miniBtn}><Receipt size={14} /> Invoicing & payments</button>
          <button onClick={() => setView("accounting")} style={miniBtn}><Calculator size={14} /> Accounting</button>
          <button onClick={() => setView("inventory")} style={miniBtn}><Boxes size={14} /> Inventory</button>
          <button onClick={() => setView("monitoring")} style={miniBtn}><Radio size={14} /> Equipment monitoring</button>
        </div>
      </div>
    </div>
  );
}

// ─── Orders (live rent orders from the website) ───────────────────────────────
const FULFILLMENT_TONE: Record<string, { bg: string; fg: string }> = {
  pending_payment: { bg: "#fdeccb", fg: "#8a5a00" },
  processing: { bg: "#fdeccb", fg: "#8a5a00" },
  paid: { bg: "#e7efe9", fg: "#2f6b46" },
  shipped: { bg: "#e3ecf7", fg: "#234e7a" },
  returned: { bg: "#efe7f7", fg: "#5a3a7a" },
  settled: { bg: "#dff0e4", fg: "#1f7a3f" },
  cancelled: { bg: "#f1e1e1", fg: "#a23c3c" },
};

// What should the admin do next for this order?
function nextAction(q: QuoteRequest): { text: string; urgent?: boolean } {
  const f = q.fulfillment_status;
  if (f === "pending_payment" || f === "processing") return { text: "Awaiting online payment — no docs issued yet. Follow up if stale.", urgent: false };
  if (f === "paid") {
    const docs = q.invoice_status === "sent" && q.contract_status === "sent" ? "Invoice + contract already emailed." : "Check invoice/contract were sent.";
    return { text: `${docs} Arrange pickup/delivery for the rental dates, then mark Shipped.`, urgent: true };
  }
  if (f === "shipped") return { text: "Gear is out with the renter. Mark Returned when it comes back.", urgent: false };
  if (f === "returned") return { text: "Inspect for damage (charge the deposit first if any), then Settle to refund the remaining deposit.", urgent: true };
  if (f === "settled") return { text: "Complete — deposit settled.", urgent: false };
  if (f === "cancelled") return { text: "Order cancelled.", urgent: false };
  return { text: "Review this order.", urgent: false };
}

// ─── Accounting (mini-QuickBooks) ─────────────────────────────────────────────
const EXPENSE_CATEGORIES = ["gear", "transport", "crew", "maintenance", "ops", "tax", "other"];
type Expense = { id: string; date: string; category: string; description: string; amount: number };

function AccountingPanel({ authCode }: { authCode: string }) {
  const { data: rentals } = useAuthList<RentalRow>("/api/admin/quotes", authCode);
  const { data: expenses, reload: reloadExpenses } = useAuthList<Expense>("/api/admin/expenses", authCode);
  const [form, setForm] = useState({ date: "", category: "gear", description: "", amount: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const income = useMemo(() => {
    let collected = 0, refunds = 0, receivables = 0, deposits = 0, incidents = 0;
    const rows: { number: string; client: string; paid: number; balance: number; cancelled: boolean; refund: number }[] = [];
    for (const r of rentals) {
      if (!r.invoice) continue;
      const m = computeInvoiceMoney(r.invoice);
      // A cancellation/refund (raised in Clients & Orders) reverses revenue and
      // closes out the receivable + deposit — keep the P&L net of refunds.
      const cancelled = r.fulfillment_status === "cancelled" || r.cancel_status === "refunded" || r.cancel_status === "cancelled";
      const refund = cancelled ? Math.min(Math.max(0, Number(r.refund_amount) || 0), m.paid) : 0;
      collected += m.paid;
      refunds += refund;
      if (!cancelled) { receivables += m.balance; deposits += m.depositReceived; incidents += m.incidentsTotal; }
      rows.push({ number: r.invoice.number, client: r.invoice.client.name || r.email, paid: m.paid, balance: cancelled ? 0 : m.balance, cancelled, refund });
    }
    const revenue = collected - refunds; // net cash kept
    return { revenue, collected, refunds, receivables, deposits, incidents, rows };
  }, [rentals]);
  const expenseTotal = useMemo(() => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const net = income.revenue - expenseTotal;

  const resetForm = () => { setForm({ date: "", category: "gear", description: "", amount: "" }); setEditingId(null); };
  // POST a new expense or PATCH the one being edited.
  const saveExpense = async () => {
    if (!form.date || !(Number(form.amount) > 0)) { setError("Date and a positive amount are required."); return; }
    setBusy(true); setError("");
    try {
      const url = editingId ? `/api/admin/expenses?id=${encodeURIComponent(editingId)}` : "/api/admin/expenses";
      const res = await fetch(url, { method: editingId ? "PATCH" : "POST", headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Could not save expense.");
      resetForm();
      reloadExpenses();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save expense."); }
    finally { setBusy(false); }
  };
  const startEdit = (e: Expense) => { setEditingId(e.id); setForm({ date: e.date, category: e.category, description: e.description, amount: String(e.amount) }); setError(""); };
  const removeExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    if (editingId === id) resetForm();
    await fetch(`/api/admin/expenses?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${authCode}` } });
    reloadExpenses();
  };

  const stat = (label: string, value: string, color = "#15130f") => (
    <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6c675f", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 24, fontWeight: 800, marginTop: 4, color }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {stat("Revenue collected", formatPHP(income.revenue), "#2f6b46")}
        {income.refunds > 0 && stat("Refunds", `-${formatPHP(income.refunds)}`, "#c0392b")}
        {stat("Receivables", formatPHP(income.receivables), "#b06a00")}
        {stat("Deposits held", formatPHP(income.deposits))}
        {stat("Expenses", formatPHP(expenseTotal), "#c0392b")}
        {stat("Net (P&L)", formatPHP(net), net >= 0 ? "#2f6b46" : "#c0392b")}
      </div>

      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 10px" }}>{editingId ? "Edit expense" : "Record an expense"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "130px 130px 1fr 120px auto", gap: 8, alignItems: "end" }}>
          <LabeledField label="Date"><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={editInput} /></LabeledField>
          <LabeledField label="Category"><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={editInput}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></LabeledField>
          <LabeledField label="Description"><input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={editInput} /></LabeledField>
          <LabeledField label="Amount (₱)"><input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} style={editInput} /></LabeledField>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={saveExpense} disabled={busy} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>{busy ? <Loader2 size={14} className="spin" /> : editingId ? <Save size={14} /> : <Plus size={14} />} {editingId ? "Save" : "Add"}</button>
            {editingId && <button onClick={resetForm} disabled={busy} style={miniBtn}>Cancel</button>}
          </div>
        </div>
        {error && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          {expenses.length === 0 && <p style={{ color: "#6c675f", fontSize: 13, margin: 0 }}>No expenses recorded.</p>}
          {expenses.map((e) => (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 90px 1fr 110px 26px 26px", gap: 8, alignItems: "center", fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6, background: editingId === e.id ? "rgba(245,197,24,0.14)" : undefined }}>
              <span style={{ color: "#6c675f" }}>{e.date}</span>
              <span><DocChip label={e.category} on={false} /></span>
              <span>{e.description}</span>
              <span style={{ textAlign: "right", fontWeight: 700, color: "#c0392b" }}>{formatPHP(Number(e.amount) || 0)}</span>
              <button onClick={() => startEdit(e)} style={{ ...tinyBtn, padding: 4 }} aria-label="Edit"><Pencil size={13} /></button>
              <button onClick={() => removeExpense(e.id)} style={{ ...tinyBtn, padding: 4, color: "#c0392b" }} aria-label="Delete"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 10px" }}>Invoice income</h3>
        {income.rows.length === 0 ? <p style={{ color: "#6c675f", fontSize: 13, margin: 0 }}>No invoices yet.</p> : (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px", gap: 8, fontSize: 11, color: "#6c675f", fontWeight: 700 }}>
              <span>Invoice</span><span>Client</span><span style={{ textAlign: "right" }}>Collected</span><span style={{ textAlign: "right" }}>Balance</span>
            </div>
            {income.rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px", gap: 8, fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6 }}>
                <span>{r.number}</span>
                <span>{r.client}{r.cancelled && <span style={{ marginLeft: 6, fontSize: 11, color: "#c0392b", fontWeight: 700 }}>cancelled{r.refund > 0 ? ` · refunded ${formatPHP(r.refund)}` : ""}</span>}</span>
                <span style={{ textAlign: "right", color: r.cancelled ? "#6c675f" : "#2f6b46", fontWeight: 700, textDecoration: r.cancelled ? "line-through" : undefined }}>{formatPHP(r.paid)}</span>
                <span style={{ textAlign: "right", color: r.balance > 0 ? "#b06a00" : "#6c675f" }}>{formatPHP(r.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inventory + Equipment Monitoring ─────────────────────────────────────────
type Unit = { id: string; name: string; category: string | null; serial: string | null; status: "available" | "rented" | "maintenance" | "retired"; location_label: string | null; lat: number | null; lng: number | null; last_seen: string | null; assigned_request_id: string | null; notes: string | null };
const UNIT_STATUSES = ["available", "rented", "maintenance", "retired"] as const;
const STATUS_COLOR: Record<string, string> = { available: "#2f6b46", rented: "#b06a00", maintenance: "#7a6f00", retired: "#888" };

function InventoryPanel({ authCode }: { authCode: string }) {
  const { data: units, loading, reload } = useAuthList<Unit>("/api/admin/units", authCode);
  const byType = useMemo(() => {
    const map = new Map<string, { total: number; available: number; rented: number; maintenance: number; retired: number }>();
    for (const u of units) {
      const k = u.name;
      const e = map.get(k) ?? { total: 0, available: 0, rented: 0, maintenance: 0, retired: 0 };
      e.total++; e[u.status]++; map.set(k, e);
    }
    // Surface what's out: rows with units rented float to the top (most rented
    // first), then the rest alphabetically.
    return [...map.entries()].sort((a, b) => b[1].rented - a[1].rented || a[0].localeCompare(b[0]));
  }, [units]);
  const totals = useMemo(() => units.reduce((a, u) => { a.total++; a[u.status]++; return a; }, { total: 0, available: 0, rented: 0, maintenance: 0, retired: 0 } as Record<string, number>), [units]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Metric label="Total units" value={String(totals.total)} />
        <Metric label="Available" value={String(totals.available)} />
        <Metric label="Rented out" value={String(totals.rented)} />
        <Metric label="Maintenance" value={String(totals.maintenance)} />
      </div>
      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>Availability by type</h3>
          <button onClick={reload} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
        </div>
        <p style={{ color: "#6c675f", fontSize: 12, marginTop: 0 }}>Auto-updates as units are checked out under Equipment Monitoring.</p>
        {byType.length === 0 ? <p style={{ color: "#6c675f", fontSize: 13 }}>No units registered yet — add them under Equipment Monitoring.</p> : (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 90px", gap: 8, fontSize: 11, color: "#6c675f", fontWeight: 700 }}>
              <span>Type</span><span style={{ textAlign: "right" }}>Total</span><span style={{ textAlign: "right" }}>Available</span><span style={{ textAlign: "right" }}>Rented</span><span style={{ textAlign: "right" }}>Maint.</span>
            </div>
            {byType.map(([name, e]) => {
              const out = e.rented > 0;
              return (
                <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 90px", gap: 8, fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6, alignItems: "center", background: out ? "rgba(176,106,0,0.08)" : undefined, borderLeft: out ? "3px solid #b06a00" : "3px solid transparent", paddingLeft: 8, marginLeft: -8, borderRadius: out ? 4 : 0 }}>
                  <span style={{ fontWeight: out ? 700 : 400 }}>{name}</span>
                  <span style={{ textAlign: "right" }}>{e.total}</span>
                  <span style={{ textAlign: "right", color: "#2f6b46", fontWeight: 700 }}>{e.available}</span>
                  <span style={{ textAlign: "right" }}>
                    {out
                      ? <span style={{ background: "#b06a00", color: "#fff", fontWeight: 800, borderRadius: 999, padding: "1px 9px" }}>{e.rented}</span>
                      : <span style={{ color: "#b8b2a6" }}>0</span>}
                  </span>
                  <span style={{ textAlign: "right" }}>{e.maintenance || <span style={{ color: "#b8b2a6" }}>0</span>}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Packages (production bundles) — CRUD + pricing, synced to the storefront ──
function PackagesPanel({ authCode }: { authCode: string }) {
  const { packages, refreshPackages } = useStore();
  const [editing, setEditing] = useState<PackageOffer | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (offer: PackageOffer, mode: "POST" | "PUT") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: mode,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authCode}` },
        body: JSON.stringify(offer),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not save package.");
        return;
      }
      await refreshPackages();
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This removes it from the storefront.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/packages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authCode}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not delete package.");
        return;
      }
      await refreshPackages();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="surface" style={{ padding: 18, borderRadius: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 22, margin: 0 }}>{editing ? "Edit package" : "Add a package"}</h2>
          <span style={{ fontSize: 12, color: "#6c675f" }}>{packages.length} package{packages.length === 1 ? "" : "s"}</span>
          <a href="/packages" target="_blank" rel="noreferrer" style={{ ...miniBtn, marginLeft: "auto", textDecoration: "none" }}><ExternalLink size={14} /> View packages</a>
        </div>
        <p style={{ color: "#6c675f", fontSize: 13, margin: "0 0 14px" }}>Production bundles sold on the storefront. The day rate is the price clients pay to rent the package; everything you save here syncs to the live site automatically.</p>
        <PackageForm
          key={editing?.id ?? "new"}
          initial={editing}
          busy={busy}
          onSave={(offer) => void save(offer, editing ? "PUT" : "POST")}
          onClear={() => setEditing(null)}
        />
      </section>

      <section className="surface" style={{ padding: 18, borderRadius: 20 }}>
        <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 12px" }}>Existing packages</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {packages.map((offer) => (
            <div key={offer.id} style={{ padding: 14, borderRadius: 16, background: "#f0ece3", border: "1px solid rgba(17,17,17,0.1)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ minWidth: 200 }}>
                <strong>{offer.name}</strong>
                <div style={{ color: "#6c675f", fontSize: 13 }}>{currency(offer.pricePerDay)}/day{offer.priceRange ? ` · range ${offer.priceRange}` : ""} · {offer.inclusions.length} inclusion{offer.inclusions.length === 1 ? "" : "s"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`/packages/${offer.slug}`} target="_blank" rel="noreferrer" style={{ ...miniBtn, textDecoration: "none" }} title="Preview on the live site"><Eye size={14} /> Preview</a>
                <button onClick={() => setEditing(offer)} style={miniBtn} disabled={busy}><Pencil size={14} /> Edit</button>
                <button onClick={() => void remove(offer.id, offer.name)} style={miniBtn} disabled={busy}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p style={{ color: "#6c675f", fontSize: 13 }}>No packages yet — add one above.</p>}
        </div>
      </section>
    </div>
  );
}

function PackageForm({
  initial,
  busy,
  onSave,
  onClear,
}: {
  initial: PackageOffer | null;
  busy: boolean;
  onSave: (offer: PackageOffer) => void;
  onClear: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? "");
  const [priceRange, setPriceRange] = useState(initial?.priceRange ?? "");
  const [pricePerDay, setPricePerDay] = useState(String(initial?.pricePerDay ?? 0));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [bestFor, setBestFor] = useState(initial?.bestFor ?? "");
  const [inclusionsText, setInclusionsText] = useState(arrayToLines(initial?.inclusions ?? []));
  const [detailsText, setDetailsText] = useState(arrayToLines(initial?.details ?? []));
  const [reviewNotesText, setReviewNotesText] = useState(arrayToLines(initial?.reviewNotes ?? []));
  const [relatedText, setRelatedText] = useState(arrayToLines(initial?.relatedItemSlugs ?? []));

  const save = () => {
    if (!name.trim()) {
      alert("Please enter a package name.");
      return;
    }
    const baseSlug = slugify(name);
    const offer: PackageOffer = {
      // Preserve id + slug on edit so /packages/[slug] links and cart ids stay valid.
      id: initial?.id ?? baseSlug,
      slug: initial?.slug ?? baseSlug,
      name: name.trim(),
      eyebrow: eyebrow.trim(),
      priceRange: priceRange.trim(),
      pricePerDay: Number(pricePerDay) || 0,
      description: description.trim(),
      inclusions: linesToArray(inclusionsText),
      details: linesToArray(detailsText),
      bestFor: bestFor.trim(),
      reviewNotes: linesToArray(reviewNotesText),
      relatedItemSlugs: linesToArray(relatedText),
      sortOrder: initial?.sortOrder ?? 0,
    };
    onSave(offer);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
        <Field label="Package name" value={name} onChange={setName} />
        <Field label="Eyebrow (small label)" value={eyebrow} onChange={setEyebrow} />
        <Field label="Rate/day (₱) — synced to site" value={pricePerDay} onChange={setPricePerDay} />
        <Field label="Price range (planning guide)" value={priceRange} onChange={setPriceRange} />
      </div>

      <Field label="Description" value={description} onChange={setDescription} textarea />
      <Field label="Best for" value={bestFor} onChange={setBestFor} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
        <Field label="Inclusions (one per line)" value={inclusionsText} onChange={setInclusionsText} textarea />
        <Field label="More details (one per line)" value={detailsText} onChange={setDetailsText} textarea />
        <Field label="Admin review notes (one per line)" value={reviewNotesText} onChange={setReviewNotesText} textarea />
        <Field label="Related item slugs (one per line)" value={relatedText} onChange={setRelatedText} textarea />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save} style={miniBtn} disabled={busy}>
          {busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} {initial ? "Save changes" : "Add package"}
        </button>
        {initial && <button onClick={onClear} style={miniBtn} disabled={busy}>Cancel</button>}
      </div>
    </div>
  );
}

function MonitoringPanel({ authCode }: { authCode: string }) {
  const { data: units, loading, error, reload } = useAuthList<Unit>("/api/admin/units", authCode);
  const [form, setForm] = useState({ name: "", category: "", serial: "", location_label: "" });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/admin/units", { method: "POST", headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ name: "", category: "", serial: "", location_label: "" });
      reload();
    } finally { setBusy(false); }
  };
  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/units?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    reload();
  };
  const remove = async (id: string) => { if (!confirm("Delete this unit?")) return; await fetch(`/api/admin/units?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${authCode}` } }); reload(); };
  const qrSrc = (u: Unit) => `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=${encodeURIComponent(`https://vissionlink.com/admin?unit=${u.id}`)}`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: "0 0 4px" }}>Register a unit</h3>
        <p style={{ color: "#6c675f", fontSize: 12, marginTop: 0 }}>Each unit gets a QR (links to the unit) and a status. GPS lat/lng are last-known — wire physical tags later to auto-update location.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 1fr auto", gap: 8, alignItems: "end" }}>
          <LabeledField label="Equipment name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="RED KOMODO 6K body" style={editInput} /></LabeledField>
          <LabeledField label="Category"><input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={editInput} /></LabeledField>
          <LabeledField label="Serial"><input value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} style={editInput} /></LabeledField>
          <LabeledField label="Location"><input value={form.location_label} onChange={(e) => setForm((f) => ({ ...f, location_label: e.target.value }))} placeholder="Warehouse shelf A3" style={editInput} /></LabeledField>
          <button onClick={add} disabled={busy} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>{busy ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Add</button>
        </div>
      </div>

      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', margin: 0 }}>Units</h3>
          <button onClick={reload} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
        </div>
        {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        {!loading && units.length === 0 && <p style={{ color: "#6c675f", fontSize: 13 }}>No units yet.</p>}
        <div style={{ display: "grid", gap: 10 }}>
          {units.map((u) => (
            <div key={u.id} style={{ display: "flex", gap: 12, alignItems: "center", background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 12, padding: 12, flexWrap: "wrap" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc(u)} alt="QR" width={72} height={72} style={{ borderRadius: 8, background: "#fff", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}>{u.name}<span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLOR[u.status], borderRadius: 999, padding: "2px 8px" }}>{u.status}</span></div>
                <div style={{ fontSize: 12, color: "#6c675f", marginTop: 2 }}>{[u.category, u.serial && `SN ${u.serial}`].filter(Boolean).join(" · ") || "—"}</div>
                <div style={{ fontSize: 12, color: "#6c675f", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}><MapPin size={12} /> {u.location_label || "Unknown"}{u.last_seen ? ` · ${fmtDate(u.last_seen)}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <select value={u.status} onChange={(e) => patch(u.id, { status: e.target.value })} style={{ ...editInput, fontSize: 12, width: "auto" }}>
                  {UNIT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { const loc = prompt("Update location label", u.location_label || ""); if (loc !== null) void patch(u.id, { location_label: loc }); }} style={tinyBtn}><MapPin size={13} /> Set location</button>
                <a href={qrSrc(u).replace("96x96", "300x300")} target="_blank" rel="noreferrer" style={{ ...tinyBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><QrCode size={13} /> QR</a>
                <button onClick={() => remove(u.id)} style={{ ...tinyBtn, color: "#c0392b" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-assign physical units to a contract ─────────────────────────────────
type PlanUnit = { id: string; name: string; serial: string | null };
type PlanLine = { lineId: string; description: string; qty: number; shortfall: number; units: PlanUnit[] };
type AssignPlan = { lines: PlanLine[]; totalRequested: number; totalAssigned: number; totalShortfall: number; committed?: boolean };

function UnitAssignPanel({ requestId, authCode }: { requestId: string; authCode: string }) {
  const [plan, setPlan] = useState<AssignPlan | null>(null);
  const [committed, setCommitted] = useState(false);
  const [busy, setBusy] = useState<null | "preview" | "apply" | "release">(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (method: "GET" | "POST" | "DELETE", kind: "preview" | "apply" | "release") => {
    setBusy(kind); setError(null);
    try {
      const res = await fetch(`/api/admin/units/assign?requestId=${encodeURIComponent(requestId)}`, {
        method, headers: { Authorization: `Bearer ${authCode}`, "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Could not reach the assignment service."); return; }
      if (method === "DELETE") { setPlan(null); setCommitted(false); return; }
      setPlan(json as AssignPlan);
      setCommitted(Boolean((json as AssignPlan).committed));
    } finally { setBusy(null); }
  };

  return (
    <div className="surface" style={{ padding: 14, border: "1px solid rgba(17,17,17,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Boxes size={16} />
          <strong style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>Equipment units</strong>
        </div>
        <button onClick={() => call("GET", "preview")} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }}>
          {busy === "preview" ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Match available units
        </button>
      </div>
      <p style={{ color: "#6c675f", fontSize: 12, margin: "6px 0 0" }}>Matches each equipment line to free units in inventory. Save the contract first — matching uses the saved equipment lines.</p>
      {error && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}

      {plan && (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {plan.lines.map((l) => (
            <div key={l.lineId} style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{l.description || "—"}</span>
                <span style={{ fontSize: 12, color: l.shortfall > 0 ? "#b06a00" : "#2f6b46", fontWeight: 700, whiteSpace: "nowrap" }}>
                  {l.units.length}/{l.qty} matched{l.shortfall > 0 ? ` · ${l.shortfall} short` : ""}
                </span>
              </div>
              {l.units.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {l.units.map((u) => (
                    <span key={u.id} style={{ fontSize: 11, fontWeight: 700, background: "rgba(47,107,70,0.12)", color: "#2f6b46", borderRadius: 999, padding: "2px 8px" }}>{u.name}</span>
                  ))}
                </div>
              )}
              {l.shortfall > 0 && <div style={{ fontSize: 11, color: "#b06a00", marginTop: 5 }}>Not enough matching units in stock — register more under Equipment Monitoring or adjust the line.</div>}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
            <span style={{ fontSize: 12, color: "#6c675f" }}>
              {committed ? <span style={{ color: "#2f6b46", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><PackageCheck size={13} /> Reserved {plan.totalAssigned} unit{plan.totalAssigned === 1 ? "" : "s"}.</span>
                : `${plan.totalAssigned} of ${plan.totalRequested} units matched${plan.totalShortfall > 0 ? ` · ${plan.totalShortfall} short` : ""}.`}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => call("DELETE", "release")} disabled={busy !== null} style={{ ...tinyBtn, color: "#c0392b" }}>
                {busy === "release" ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Release units
              </button>
              <button onClick={() => call("POST", "apply")} disabled={busy !== null || plan.totalAssigned === 0} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy || plan.totalAssigned === 0 ? 0.6 : 1 }}>
                {busy === "apply" ? <Loader2 size={14} className="spin" /> : <PackageCheck size={14} />} {committed ? "Re-apply" : "Reserve these units"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contract editor ──────────────────────────────────────────────────────────
function ContractEditor({ request, authCode, onClose, onSent, onSaved, onDiscarded }: { request: QuoteRequest; authCode: string; onClose: () => void; onSent: (id: string) => void; onSaved: (id: string) => void; onDiscarded: (id: string) => void }) {
  const normalize = useCallback((d: ContractDoc) => ({ ...d, laborLines: d.laborLines ?? [] }), []);
  const { doc, setDoc, loading, error, busy, notice, save, preview, discard } = useDocEditor<ContractDoc>("/api/admin/contracts", request.id, authCode, normalize);
  const totals = useMemo(() => (doc ? computeTotals(doc) : null), [doc]);
  const patch = (p: Partial<ContractDoc>) => setDoc((d) => (d ? { ...d, ...p } : d));
  const bandHelpers = useLineBandHelpers(setDoc as never);

  return (
    <DocModal title={`Contract${doc ? ` · ${doc.number}` : ""}`} onClose={onClose}>
      {loading && <p style={{ color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Loader2 size={14} className="spin" /> Loading agreed quotation…</p>}
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      {doc && totals && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <LabeledField label="Client name"><input value={doc.client.name} onChange={(e) => patch({ client: { ...doc.client, name: e.target.value } })} style={editInput} /></LabeledField>
            <LabeledField label="Client email"><input value={doc.client.email} onChange={(e) => patch({ client: { ...doc.client, email: e.target.value } })} style={editInput} /></LabeledField>
            <LabeledField label="Agreement date"><input type="date" value={doc.agreementDate} onChange={(e) => patch({ agreementDate: e.target.value })} style={editInput} /></LabeledField>
            <div />
            <LabeledField label="Rental from"><input type="date" value={doc.rentalFrom} onChange={(e) => patch({ rentalFrom: e.target.value })} style={editInput} /></LabeledField>
            <LabeledField label="Rental to"><input type="date" value={doc.rentalTo} onChange={(e) => patch({ rentalTo: e.target.value })} style={editInput} /></LabeledField>
          </div>

          <LineBand title="Equipment" lines={doc.lines} picker={equipmentPicker} onAdd={(p) => bandHelpers.add("lines", p)} onPatch={(id, p) => bandHelpers.patch("lines", id, p)} onRemove={(id) => bandHelpers.remove("lines", id)} />
          <LineBand title="Labor / Personnel" lines={doc.laborLines} picker={laborPicker} onAdd={(p) => bandHelpers.add("laborLines", p)} onPatch={(id, p) => bandHelpers.patch("laborLines", id, p)} onRemove={(id) => bandHelpers.remove("laborLines", id)} />

          <UnitAssignPanel requestId={request.id} authCode={authCode} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={doc.applySurcharge} onChange={(e) => patch({ applySurcharge: e.target.checked })} /> Out-of-town surcharge ({Math.round(doc.surchargeRate * 100)}%)
              </label>
              <LabeledField label="Special discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.specialDiscountRate * 100)} onChange={(e) => patch({ specialDiscountRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 })} style={editInput} /></LabeledField>
              <LabeledField label="Payment terms"><textarea value={doc.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>
            </div>
            <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 5, alignContent: "start" }}>
              {doc.laborLines.length > 0 && <Row label="Equipment cost" value={formatPHP(totals.equipmentSubtotal)} />}
              {doc.laborLines.length > 0 && <Row label="Labor cost" value={formatPHP(totals.laborSubtotal)} />}
              {doc.applySurcharge && <Row label={`Surcharge (${Math.round(doc.surchargeRate * 100)}%)`} value={formatPHP(totals.surcharge)} />}
              <Row label="Subtotal" value={formatPHP(totals.subtotal)} />
              {totals.discount > 0 && <Row label={`Special discount (${Math.round(doc.specialDiscountRate * 100)}%)`} value={"- " + formatPHP(totals.discount)} />}
              <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "4px 0" }} />
              <Row label="CONTRACT TOTAL" value={formatPHP(totals.total)} bold />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Owner (provider) signature</span>
              <SignaturePad value={doc.providerSignatureDataUrl} onChange={(s) => patch({ providerSignatureDataUrl: s })} />
              <LabeledField label="Signed by"><input value={doc.providerSignedBy} onChange={(e) => patch({ providerSignedBy: e.target.value })} style={editInput} /></LabeledField>
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13 }}>Client signature (optional — for face-to-face)</span>
              <SignaturePad value={doc.clientSignatureDataUrl} onChange={(s) => patch({ clientSignatureDataUrl: s })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <LabeledField label="Signed by"><input value={doc.clientSignedBy} onChange={(e) => patch({ clientSignedBy: e.target.value })} style={editInput} /></LabeledField>
                <LabeledField label="Position"><input value={doc.clientPosition} onChange={(e) => patch({ clientPosition: e.target.value })} style={editInput} /></LabeledField>
              </div>
            </div>
          </div>

          {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}
          <DocActions busy={busy} onPreview={preview} onSave={() => save(() => onSaved(request.id))} onDiscard={() => { if (confirm(`Discard contract ${doc.number}? The draft and its stored PDF are deleted; you can rebuild it from source pricing.`)) void discard(() => { onDiscarded(request.id); onClose(); }); }} />
        </div>
      )}
    </DocModal>
  );
}

// ─── Invoice editor ───────────────────────────────────────────────────────────
function InvoiceEditor({ request, authCode, onClose, onSent, onSaved, onDiscarded }: { request: QuoteRequest; authCode: string; onClose: () => void; onSent: (id: string) => void; onSaved: (id: string) => void; onDiscarded: (id: string) => void }) {
  const normalize = useCallback((d: InvoiceDoc) => ({ ...d, laborLines: d.laborLines ?? [], payments: d.payments ?? [], incidents: d.incidents ?? [], acceptedChannels: d.acceptedChannels ?? [...ALL_CHANNELS] }), []);
  const { doc, setDoc, loading, error, busy, notice, meta, save, preview, discard } = useDocEditor<InvoiceDoc>("/api/admin/invoices", request.id, authCode, normalize);
  const money = useMemo(() => (doc ? computeInvoiceMoney(doc) : null), [doc]);
  const policy = (meta?.policy as ClientPolicy | undefined) ?? null;
  const patch = (p: Partial<InvoiceDoc>) => setDoc((d) => (d ? { ...d, ...p } : d));
  const bandHelpers = useLineBandHelpers(setDoc as never);

  const newId = (n: number) => `${Date.now().toString(36)}-${n}`;
  const addIncident = () => setDoc((d) => (d ? { ...d, incidents: [...d.incidents, { id: newId(d.incidents.length), date: doc?.issueDate ?? "", description: "", amount: 0 }] } : d));
  const patchIncident = (id: string, p: Partial<Incident>) => setDoc((d) => (d ? { ...d, incidents: d.incidents.map((i) => (i.id === id ? { ...i, ...p } : i)) } : d));
  const removeIncident = (id: string) => setDoc((d) => (d ? { ...d, incidents: d.incidents.filter((i) => i.id !== id) } : d));
  const addPayment = (kind: PaymentEntry["kind"]) => setDoc((d) => (d ? { ...d, payments: [...d.payments, { id: newId(d.payments.length), date: doc?.issueDate ?? "", channel: "bank_transfer", amount: 0, reference: "", kind }] } : d));
  const patchPayment = (id: string, p: Partial<PaymentEntry>) => setDoc((d) => (d ? { ...d, payments: d.payments.map((x) => (x.id === id ? { ...x, ...p } : x)) } : d));
  const removePayment = (id: string) => setDoc((d) => (d ? { ...d, payments: d.payments.filter((x) => x.id !== id) } : d));
  const toggleChannel = (c: PaymentChannel) => setDoc((d) => (d ? { ...d, acceptedChannels: d.acceptedChannels.includes(c) ? d.acceptedChannels.filter((x) => x !== c) : [...d.acceptedChannels, c] } : d));
  const pct = (k: "loyaltyDiscountRate" | "pdcDiscountRate" | "promptPayDiscountRate") => (v: string) => patch({ [k]: Math.min(100, Math.max(0, Number(v) || 0)) / 100 } as Partial<InvoiceDoc>);

  return (
    <DocModal title={`Invoice${doc ? ` · ${doc.number}` : ""}`} onClose={onClose}>
      {loading && <p style={{ color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}><Loader2 size={14} className="spin" /> Loading agreed quotation…</p>}
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      {doc && money && (
        <div style={{ display: "grid", gap: 16 }}>
          {policy && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: policy.standing === "blocked" ? "#fbe6e6" : policy.standing === "watch" ? "#fff3c4" : "#e7efe9", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{policy.tierLabel}</span>
              <DocChip label={policy.standing} on={policy.standing !== "good"} tone={policy.standing === "good" ? "green" : undefined} />
              <span style={{ fontSize: 12, color: "#3a362f" }}>Loyalty {Math.round(policy.loyaltyRate * 100)}% · deposit {Math.round(policy.depositRate * 100)}% · PDC {policy.pdcAllowed ? "allowed" : "not allowed"}</span>
              <span style={{ fontSize: 12, color: "#6c675f", flexBasis: "100%" }}>{policy.reason}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <LabeledField label="Client name"><input value={doc.client.name} onChange={(e) => patch({ client: { ...doc.client, name: e.target.value } })} style={editInput} /></LabeledField>
            <LabeledField label="Client email"><input value={doc.client.email} onChange={(e) => patch({ client: { ...doc.client, email: e.target.value } })} style={editInput} /></LabeledField>
            <LabeledField label="Issue date"><input type="date" value={doc.issueDate} onChange={(e) => patch({ issueDate: e.target.value })} style={editInput} /></LabeledField>
            <LabeledField label="Due date"><input type="date" value={doc.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} style={editInput} /></LabeledField>
          </div>

          <LineBand title="Equipment" lines={doc.lines} picker={equipmentPicker} onAdd={(p) => bandHelpers.add("lines", p)} onPatch={(id, p) => bandHelpers.patch("lines", id, p)} onRemove={(id) => bandHelpers.remove("lines", id)} />
          <LineBand title="Labor / Personnel" lines={doc.laborLines} picker={laborPicker} onAdd={(p) => bandHelpers.add("laborLines", p)} onPatch={(id, p) => bandHelpers.patch("laborLines", id, p)} onRemove={(id) => bandHelpers.remove("laborLines", id)} />

          {/* Discounts + deposit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <LabeledField label="Special discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.specialDiscountRate * 100)} onChange={(e) => patch({ specialDiscountRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 })} style={editInput} /></LabeledField>
            <LabeledField label="Loyalty discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.loyaltyDiscountRate * 100)} onChange={(e) => pct("loyaltyDiscountRate")(e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="PDC discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.pdcDiscountRate * 100)} onChange={(e) => pct("pdcDiscountRate")(e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Prompt-pay discount (%)"><input type="number" min={0} max={100} value={Math.round(doc.promptPayDiscountRate * 100)} onChange={(e) => pct("promptPayDiscountRate")(e.target.value)} style={editInput} /></LabeledField>
            <LabeledField label="Required deposit (₱)"><input type="number" min={0} value={doc.depositRequired} onChange={(e) => patch({ depositRequired: Math.max(0, Number(e.target.value) || 0) })} style={editInput} /></LabeledField>
            <LabeledField label="Late interest (%/mo)"><input type="number" min={0} value={Math.round(doc.lateInterestMonthlyRate * 100)} onChange={(e) => patch({ lateInterestMonthlyRate: Math.max(0, Number(e.target.value) || 0) / 100 })} style={editInput} /></LabeledField>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={doc.applySurcharge} onChange={(e) => patch({ applySurcharge: e.target.checked })} /> Out-of-town surcharge ({Math.round(doc.surchargeRate * 100)}%)
          </label>

          {/* Payment channels */}
          <div>
            <span style={{ fontWeight: 800, fontSize: 13 }}>Accepted payment channels</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              {ALL_CHANNELS.map((c) => (
                <label key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 8, padding: "6px 9px" }}>
                  <input type="checkbox" checked={doc.acceptedChannels.includes(c)} onChange={() => toggleChannel(c)} /> {CHANNEL_LABELS[c]}
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
              <LabeledField label="PDC dated on/before"><input type="date" value={doc.pdcDueDate} onChange={(e) => patch({ pdcDueDate: e.target.value })} style={editInput} /></LabeledField>
              <LabeledField label="Online payment link (PayMongo)"><input value={doc.payMongoLink} onChange={(e) => patch({ payMongoLink: e.target.value })} placeholder="https://pm.link/…" style={editInput} /></LabeledField>
            </div>
          </div>

          {/* Incident ledger */}
          <LedgerRows
            title="Incidents / charges (damage, loss, late) — deposit absorbs these first"
            addLabel="Add incident"
            onAdd={addIncident}
            cols="1fr 110px 110px 26px"
            header={["Description", "Date", "Amount", ""]}
            rows={doc.incidents.map((i) => ({ id: i.id, cells: [
              <input key="d" value={i.description} onChange={(e) => patchIncident(i.id, { description: e.target.value })} placeholder="e.g. cracked ND filter" style={editInput} />,
              <input key="t" type="date" value={i.date} onChange={(e) => patchIncident(i.id, { date: e.target.value })} style={editInput} />,
              <input key="a" type="number" min={0} value={i.amount} onChange={(e) => patchIncident(i.id, { amount: Math.max(0, Number(e.target.value) || 0) })} style={{ ...editInput, textAlign: "right" }} />,
            ], onRemove: () => removeIncident(i.id) }))}
          />

          {/* Payments ledger */}
          <LedgerRows
            title="Payments received (deposit + balance)"
            addLabel="Add payment"
            extraAdd={{ label: "Add deposit", onClick: () => addPayment("deposit") }}
            onAdd={() => addPayment("payment")}
            cols="92px 1fr 110px 1fr 26px"
            header={["Kind", "Channel", "Date · Amount", "Reference", ""]}
            rows={doc.payments.map((p) => ({ id: p.id, cells: [
              <select key="k" value={p.kind} onChange={(e) => patchPayment(p.id, { kind: e.target.value as PaymentEntry["kind"] })} style={{ ...editInput, fontSize: 12 }}><option value="deposit">Deposit</option><option value="payment">Payment</option></select>,
              <select key="c" value={p.channel} onChange={(e) => patchPayment(p.id, { channel: e.target.value as PaymentChannel })} style={{ ...editInput, fontSize: 12 }}>{ALL_CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}</select>,
              <div key="da" style={{ display: "grid", gap: 4 }}><input type="date" value={p.date} onChange={(e) => patchPayment(p.id, { date: e.target.value })} style={editInput} /><input type="number" min={0} value={p.amount} onChange={(e) => patchPayment(p.id, { amount: Math.max(0, Number(e.target.value) || 0) })} style={{ ...editInput, textAlign: "right" }} /></div>,
              <input key="r" value={p.reference} onChange={(e) => patchPayment(p.id, { reference: e.target.value })} placeholder="cheque #, ref no." style={editInput} />,
            ], onRemove: () => removePayment(p.id) }))}
          />

          <LabeledField label="Payment terms"><textarea value={doc.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>

          {/* Money breakdown */}
          <div style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 12, padding: 12, fontSize: 13, display: "grid", gap: 5 }}>
            <Row label="Rental total" value={formatPHP(money.rental)} />
            {money.loyaltyDiscount > 0 && <Row label={`Loyalty discount (${Math.round(doc.loyaltyDiscountRate * 100)}%)`} value={"- " + formatPHP(money.loyaltyDiscount)} />}
            {money.pdcDiscount > 0 && <Row label={`PDC discount (${Math.round(doc.pdcDiscountRate * 100)}%)`} value={"- " + formatPHP(money.pdcDiscount)} />}
            {money.promptDiscount > 0 && <Row label={`Prompt-pay discount (${Math.round(doc.promptPayDiscountRate * 100)}%)`} value={"- " + formatPHP(money.promptDiscount)} />}
            {money.discountsTotal > 0 && <Row label="Net rental" value={formatPHP(money.net)} />}
            {money.incidentsTotal > 0 && <Row label="Incidents / charges" value={"+ " + formatPHP(money.incidentsTotal)} />}
            {doc.depositRequired > 0 && <Row label={`Required deposit${money.depositReceived >= doc.depositRequired ? " ✓ received" : ` (received ${formatPHP(money.depositReceived)})`}`} value={formatPHP(doc.depositRequired)} />}
            {money.paid > 0 && <Row label="Payments received" value={"- " + formatPHP(money.paid)} />}
            <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "4px 0" }} />
            {money.interest > 0 && <Row label="Amount payable" value={formatPHP(money.principal)} />}
            {money.interest > 0 && <Row label={`Late interest (${Math.round(doc.lateInterestMonthlyRate * 100)}%/mo · ${money.daysOverdue}d overdue)`} value={"+ " + formatPHP(money.interest)} />}
            <Row label={`BALANCE DUE · ${money.status.toUpperCase()}`} value={formatPHP(money.balance)} bold />
          </div>

          {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}
          <DocActions busy={busy} onPreview={preview} onSave={() => save(() => onSaved(request.id))} onDiscard={() => { if (confirm(`Discard invoice ${doc.number}? The draft and its stored PDF are deleted; you can rebuild it from source pricing.`)) void discard(() => { onDiscarded(request.id); onClose(); }); }} />
        </div>
      )}
    </DocModal>
  );
}

// Small add/remove ledger table used for incidents & payments in the invoice editor.
function LedgerRows({ title, addLabel, extraAdd, onAdd, cols, header, rows }: {
  title: string;
  addLabel: string;
  extraAdd?: { label: string; onClick: () => void };
  onAdd: () => void;
  cols: string;
  header: string[];
  rows: { id: string; cells: ReactNode[]; onRemove: () => void }[];
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: 13 }}>{title}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {extraAdd && <button onClick={extraAdd.onClick} style={{ ...tinyBtn, display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={13} /> {extraAdd.label}</button>}
          <button onClick={onAdd} style={{ ...tinyBtn, display: "inline-flex", alignItems: "center", gap: 4 }}><Plus size={13} /> {addLabel}</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p style={{ color: "#9a948a", fontSize: 12, margin: "2px 2px 0" }}>None.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, fontSize: 11, color: "#6c675f", fontWeight: 700, padding: "0 2px" }}>
            {header.map((h, i) => <span key={i} style={{ textAlign: i === header.length - 2 ? "right" : "left" }}>{h}</span>)}
          </div>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center" }}>
              {r.cells}
              <button onClick={r.onRemove} style={{ ...tinyBtn, padding: 4, color: "#c0392b" }} aria-label="Remove"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Rate-card pickers reused by the contract & invoice line bands.
const equipmentPicker = { label: "+ Add from rate card…", options: RATE_CARD.map((r) => ({ value: r.key, label: `${r.name} — ${formatPHP(r.dailyRate)}`, description: r.name, unitRate: r.dailyRate })) };
const laborPicker = { label: "+ Add crew…", options: PERSONNEL_RATES.map((r) => ({ value: r.key, label: `${r.name} — ${formatPHP(r.dailyRate)}`, description: r.name, unitRate: r.dailyRate })) };

// Line-band mutation helpers bound to a doc with { lines, laborLines } bands.
function useLineBandHelpers(setDoc: (fn: (d: { lines: QuotationLine[]; laborLines: QuotationLine[] } | null) => typeof d) => void) {
  type Band = "lines" | "laborLines";
  const newId = (n: number) => `ln-${Date.now().toString(36)}-${n}`;
  const patch = (band: Band, id: string, p: Partial<QuotationLine>) =>
    setDoc((d) => (d ? { ...d, [band]: d[band].map((l) => (l.id === id ? { ...l, ...p } : l)) } : d));
  const add = (band: Band, preset?: Partial<QuotationLine>) =>
    setDoc((d) => {
      if (!d) return d;
      const days = d.lines[0]?.days ?? 1;
      const line: QuotationLine = { id: newId(d[band].length), description: "", qty: 1, days, unitRate: 0, ...preset };
      return { ...d, [band]: [...d[band], line] };
    });
  const remove = (band: Band, id: string) => setDoc((d) => (d ? { ...d, [band]: d[band].filter((l) => l.id !== id) } : d));
  return { patch, add, remove };
}

// Pointer-driven signature canvas. Emits a PNG data URL on each stroke end.
function SignaturePad({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  // Paint a saved signature back onto the canvas when the editor opens.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
    }
    // Only repaint on mount / when an externally-set value appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width, y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height };
  };

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.strokeStyle = "#15130f";
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = ref.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div style={{ marginTop: 6 }}>
      <canvas
        ref={ref}
        width={440}
        height={120}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{ width: "100%", maxWidth: 440, height: 120, background: "#fffdf8", border: "1px dashed rgba(17,17,17,0.3)", borderRadius: 10, touchAction: "none", cursor: "crosshair", display: "block" }}
      />
      <button onClick={clear} style={{ ...tinyBtn, marginTop: 6 }}>Clear signature</button>
    </div>
  );
}

const editInput: CSSProperties = {
  background: "#fffdf8",
  color: "#15130f",
  border: "1px solid rgba(17,17,17,0.18)",
  borderRadius: 9,
  padding: "9px 11px",
  outline: "none",
  fontSize: 13,
  width: "100%",
  fontFamily: "inherit",
};

// ─── Inbox ───────────────────────────────────────────────────────────────────
// Mirrors the hello@vissionlink.com Zoho mailbox: lists recent mail, opens a
// message, and replies over SMTP — all through /api/admin/inbox (Bearer-guarded).
type InboxMessage = {
  uid: number;
  from: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  date: string;
  seen: boolean;
};
type InboxMessageFull = InboxMessage & { to: string; text: string; html: string | null };

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function InboxPanel({ authCode }: { authCode: string }) {
  const [list, setList] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [unavailable, setUnavailable] = useState(""); // IMAP needs a Zoho paid plan
  const [selected, setSelected] = useState<InboxMessageFull | null>(null);
  const [opening, setOpening] = useState(false);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [replyError, setReplyError] = useState("");

  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/admin/inbox", { headers: headers() });
      const data = await res.json();
      // Plan limitation (free Zoho = no IMAP) comes back as a calm 200 flag.
      if (data && data.unavailable) { setUnavailable(data.error || "Mailbox mirroring needs a Zoho paid plan."); setList([]); return; }
      if (!res.ok) throw new Error(data.error || "Could not load inbox.");
      setUnavailable("");
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not load inbox.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openMessage = async (uid: number) => {
    setOpening(true);
    setReply("");
    setReplyStatus("idle");
    setReplyError("");
    try {
      const res = await fetch(`/api/admin/inbox?uid=${uid}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open message.");
      setSelected(data);
      setList((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not open message.");
    } finally {
      setOpening(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setReplyStatus("sending");
    setReplyError("");
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ to: selected.fromAddress, subject: selected.subject, text: reply }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send reply.");
      setReplyStatus("sent");
      setReply("");
    } catch (err) {
      setReplyStatus("error");
      setReplyError(err instanceof Error ? err.message : "Could not send reply.");
    }
  };

  const notConfigured = /not configured/i.test(listError);

  return (
    <div className="surface" style={{ padding: 18, border: "1px solid rgba(17,17,17,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 24, margin: 0 }}>Inbox</h2>
          <p style={{ margin: "2px 0 0", color: "#6c675f", fontSize: 13 }}>Mirroring hello@vissionlink.com</p>
        </div>
        <button onClick={loadList} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      {unavailable && (
        <div style={{ padding: 18, border: "1px solid rgba(17,17,17,0.12)", background: "#f0ece3", borderRadius: 12, fontSize: 13, color: "#15130f", display: "grid", gap: 8, justifyItems: "start" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800 }}><Mail size={16} /> Mailbox mirroring isn’t active</span>
          <p style={{ margin: 0, color: "#6c675f", lineHeight: 1.6, maxWidth: 560 }}>
            Reading the mailbox here uses IMAP, which Zoho only offers on its <strong>paid plans</strong> — your mailbox is on the free tier. Sending still works, so all your quotation, contract and invoice emails go out normally.
          </p>
          <p style={{ margin: 0, color: "#6c675f", lineHeight: 1.6, maxWidth: 560 }}>
            Nothing is missed: new enquiries land under <strong>E-Quotations</strong> and are also delivered to hello@vissionlink.com — open it in Zoho Mail directly to read &amp; reply.
          </p>
          <a href="https://www.zoho.com/mail/zohomail-pricing.html" target="_blank" rel="noreferrer" style={{ ...miniBtn, textDecoration: "none", marginTop: 2 }}>
            <ExternalLink size={14} /> See Zoho paid plans
          </a>
        </div>
      )}

      {listError && (
        <div style={{ padding: 14, border: "1px solid rgba(17,17,17,0.12)", background: "#f0ece3", fontSize: 13, color: "#15130f", marginBottom: 14 }}>
          {notConfigured ? (
            <>
              <strong>Mailbox not connected yet.</strong>
              <p style={{ margin: "6px 0 0", color: "#6c675f", lineHeight: 1.6 }}>
                Generate a Zoho <em>app-specific password</em> (Zoho Mail → Settings → Security → App Passwords) and set
                <code style={{ margin: "0 4px" }}>ZOHO_SMTP_PASS</code> in the environment. The inbox reads over IMAP and replies over SMTP using that one credential.
              </p>
            </>
          ) : (
            listError
          )}
        </div>
      )}

      {!unavailable && (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 300px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        {/* Message list */}
        <div style={{ display: "grid", gap: 8, maxHeight: 560, overflowY: "auto" }}>
          {!loading && !listError && list.length === 0 && (
            <p style={{ color: "#6c675f", fontSize: 13 }}>No messages.</p>
          )}
          {list.map((m) => {
            const active = selected?.uid === m.uid;
            return (
              <button
                key={m.uid}
                onClick={() => openMessage(m.uid)}
                style={{
                  textAlign: "left",
                  border: active ? "1px solid #15130f" : "1px solid rgba(17,17,17,0.12)",
                  background: active ? "#15130f" : "#fffdf8",
                  color: active ? "#fffdf8" : "#15130f",
                  padding: "11px 13px",
                  cursor: "pointer",
                  display: "grid",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {!m.seen && <span style={{ width: 7, height: 7, borderRadius: 999, background: "#d8a800", flexShrink: 0 }} />}
                  <span style={{ fontWeight: m.seen ? 600 : 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.fromName || m.fromAddress || "Unknown"}
                  </span>
                </div>
                <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: active ? 0.95 : 1 }}>
                  {m.subject}
                </span>
                <span style={{ fontSize: 11, color: active ? "rgba(247,247,242,0.6)" : "#6c675f" }}>{fmtDate(m.date)}</span>
              </button>
            );
          })}
        </div>

        {/* Reader + reply */}
        <div style={{ minHeight: 200 }}>
          {opening ? (
            <p style={{ color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="spin" /> Opening…
            </p>
          ) : !selected ? (
            <p style={{ color: "#6c675f", fontSize: 13 }}>Select a message to read and reply.</p>
          ) : (
            <div>
              <h3 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 20, margin: "0 0 6px" }}>{selected.subject}</h3>
              <p style={{ margin: 0, fontSize: 13 }}>
                <strong>{selected.fromName || selected.fromAddress}</strong>{" "}
                <span style={{ color: "#6c675f" }}>&lt;{selected.fromAddress}&gt;</span>
              </p>
              <p style={{ margin: "2px 0 14px", fontSize: 12, color: "#6c675f" }}>{fmtDate(selected.date)}</p>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "#15130f",
                  background: "#fffdf8",
                  border: "1px solid rgba(17,17,17,0.1)",
                  padding: 14,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {selected.text || "(no plain-text body)"}
              </div>

              {/* Reply */}
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <CornerUpLeft size={14} /> Reply to {selected.fromAddress}
                </p>
                {replyStatus === "sent" ? (
                  <div style={{ padding: 12, background: "rgba(245,197,24,0.18)", fontSize: 13, fontWeight: 700 }}>
                    Reply sent ✓
                    <button onClick={() => setReplyStatus("idle")} style={{ marginLeft: 10, background: "transparent", border: 0, color: "#d8a800", fontWeight: 700, cursor: "pointer" }}>
                      Write another
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={5}
                      placeholder={`Write your reply…`}
                      style={{ width: "100%", background: "#fffdf8", color: "#15130f", border: "1px solid rgba(17,17,17,0.18)", padding: "11px 13px", outline: "none", resize: "vertical" }}
                    />
                    {replyStatus === "error" && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0" }}>{replyError}</p>}
                    <button
                      onClick={sendReply}
                      disabled={replyStatus === "sending" || !reply.trim()}
                      style={{ ...miniBtn, marginTop: 10, opacity: replyStatus === "sending" || !reply.trim() ? 0.6 : 1 }}
                    >
                      {replyStatus === "sending" ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send reply
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
