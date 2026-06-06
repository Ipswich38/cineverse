"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Calculator, CornerUpLeft, ExternalLink, Eye, FileText, LayoutDashboard, Loader2, LockKeyhole, LogOut, Mail, MapPin, PackageCheck, Pencil, Plus, QrCode, Radio, Receipt, RefreshCw, Save, ScrollText, Send, Shield, Trash2, Truck, Users, X } from "lucide-react";
import { useStore } from "../providers";
import { currency, slugify, type EquipmentItem } from "@/lib/catalog";
import { CATEGORY_FLAT, categoryName, normalizeCategory } from "@/lib/categories";
import ProposalBuilder from "./ProposalBuilder";
import { computeTotals, formatPHP, lineAmount, type QuotationDoc, type QuotationLine } from "@/lib/quotation";
import { type ContractDoc } from "@/lib/contract";
import { computeInvoiceMoney, CHANNEL_LABELS, ALL_CHANNELS, type InvoiceDoc, type PaymentChannel, type PaymentEntry, type Incident } from "@/lib/invoice";
import { type ClientPolicy } from "@/lib/clients";
import { PERSONNEL_RATES, RATE_CARD } from "@/lib/bmr-rate-card";
import { PACKAGE_OFFERS } from "@/lib/package-offers";

// Admin mini-apps shown in the sidebar. ("ops"/"proposals" remain as views but
// are no longer surfaced — equipment-listing editing was retired from admin.)
type AdminView = "dashboard" | "inbox" | "quotations" | "contracts" | "invoicing" | "clients" | "accounting" | "inventory" | "monitoring" | "ops" | "proposals";
const ADMIN_SECTIONS: { key: AdminView; label: string; icon: ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { key: "inbox", label: "Inbox", icon: <Mail size={17} /> },
  { key: "quotations", label: "E-Quotations", icon: <FileText size={17} /> },
  { key: "contracts", label: "E-Contracts", icon: <ScrollText size={17} /> },
  { key: "invoicing", label: "Invoicing", icon: <Receipt size={17} /> },
  { key: "clients", label: "Clients", icon: <Users size={17} /> },
  { key: "accounting", label: "Accounting", icon: <Calculator size={17} /> },
  { key: "inventory", label: "Inventory", icon: <Boxes size={17} /> },
  { key: "monitoring", label: "Equipment Monitoring", icon: <Radio size={17} /> },
];

function AdminSidebar({ view, setView, onLogout }: { view: AdminView; setView: (v: AdminView) => void; onLogout: () => void }) {
  return (
    <aside style={{ width: 232, flexShrink: 0, background: "#15130f", color: "#fffdf8", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100dvh" }}>
      <div style={{ padding: "20px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, fontWeight: 800, color: "#ffcc00" }}>BMR Admin</div>
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
  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

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
    setView("ops");
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
      setPreviewKey((k) => k + 1);
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
      setPreviewKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="app-container" style={{ padding: "40px 0 76px", maxWidth: 560 }}>
        <div className="surface" style={{ padding: 22, borderRadius: 20 }}>
          <Shield size={26} color="#ffcc00" />
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 34, margin: "12px 0 10px" }}>Admin access</h1>
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
    <div style={{ display: "flex", minHeight: "100dvh", background: "#efece4", color: "#15130f" }}>
      <AdminSidebar view={view} setView={setView} onLogout={logout} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px clamp(14px,3vw,28px)", background: "#fffdf8", borderBottom: "1px solid rgba(17,17,17,0.1)", position: "sticky", top: 0, zIndex: 10 }}>
          {section?.icon}
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: 0 }}>{section?.label ?? "Admin"}</h1>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#6c675f" }}>BMR Operations · VissionLink</span>
        </header>
        <main style={{ padding: "20px clamp(12px,3vw,28px) 64px", flex: 1, minWidth: 0 }}>
          {view === "dashboard" && <DashboardPanel authCode={code} listingCount={approvedCount} setView={setView} />}
          {view === "inbox" && <InboxPanel authCode={code} />}
          {view === "quotations" && <QuotesPanel authCode={code} focus="quotations" />}
          {view === "contracts" && <QuotesPanel authCode={code} focus="contracts" />}
          {view === "invoicing" && <QuotesPanel authCode={code} focus="invoicing" />}
          {view === "clients" && <ClientsPanel authCode={code} />}
          {view === "accounting" && <AccountingPanel authCode={code} />}
          {view === "inventory" && <InventoryPanel authCode={code} />}
          {view === "monitoring" && <MonitoringPanel authCode={code} />}
          {view === "proposals" && <ProposalBuilder catalog={catalog} />}

      {view === "ops" && (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14, marginBottom: 18 }}>
        <Metric label="Live listings" value={`${approvedCount}`} />
      </div>

      {/* Live site preview — see the real storefront (with your listings) without leaving admin. */}
      <section className="surface" style={{ padding: 16, borderRadius: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Eye size={18} /> Site preview
          </h2>
          <button onClick={() => setShowPreview((s) => !s)} style={{ ...miniBtn, marginLeft: "auto" }}>{showPreview ? "Hide" : "Show"}</button>
          {showPreview && <button onClick={() => setPreviewKey((k) => k + 1)} style={miniBtn}><RefreshCw size={14} /> Refresh</button>}
          <a href="/store" target="_blank" rel="noreferrer" style={{ ...miniBtn, textDecoration: "none" }}><ExternalLink size={14} /> Open storefront</a>
        </div>
        {showPreview && (
          <iframe
            key={previewKey}
            src="/store"
            title="Storefront preview"
            style={{ width: "100%", height: 560, marginTop: 12, border: "1px solid rgba(17,17,17,0.14)", borderRadius: 12, background: "#fff" }}
          />
        )}
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        <section className="surface" style={{ padding: 18, borderRadius: 20 }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, marginTop: 0 }}>Inventory manager</h2>
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
              <div key={item.id} style={{ padding: 14, borderRadius: 16, background: "#f0ece3", border: "1px solid rgba(17,17,17,0.1)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: "#6c675f", fontSize: 13 }}>{categoryName(normalizeCategory(item.category))} · {item.owner}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`/gear/${item.slug}`} target="_blank" rel="noreferrer" style={{ ...miniBtn, textDecoration: "none" }} title="Preview on the live site"><Eye size={14} /> Preview</a>
                  <button onClick={() => setEditing(item)} style={miniBtn} disabled={busy}>Edit</button>
                  <button onClick={() => removeEquipment(item.id)} style={miniBtn} disabled={busy}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      </>
      )}
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
      <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 32, marginTop: 8 }}>{value}</div>
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

// Custom package quote requests submitted from /packages.
type QuoteItem = {
  id?: string;
  slug?: string;
  name?: string;
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
};

function QuotesPanel({ authCode, focus = "quotations" }: { authCode: string; focus?: "quotations" | "contracts" | "invoicing" }) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [building, setBuilding] = useState<QuoteRequest | null>(null);
  const [buildingContract, setBuildingContract] = useState<QuoteRequest | null>(null);
  const [buildingInvoice, setBuildingInvoice] = useState<QuoteRequest | null>(null);
  const [creating, setCreating] = useState(false);
  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);

  // Mark the quotation agreed/not — unlocks contract + invoice.
  const setAgreed = async (id: string, agreed: boolean) => {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ agreed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update.");
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, quotation_agreed_at: agreed ? new Date().toISOString() : null } : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setUpdating(null);
    }
  };

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load quote requests.");
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load quote requests.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const setStatus = async (id: string, status: QuoteRequest["status"]) => {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update quote.");
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update quote.");
    } finally {
      setUpdating(null);
    }
  };

  // Delete the whole request (and its quotation/contract/invoice + stored PDFs +
  // released units — handled server-side).
  const deleteQuote = async (q: QuoteRequest) => {
    if (!confirm(`Delete the request from ${q.name}? This removes its quotation, contract, invoice and stored PDFs. This cannot be undone.`)) return;
    setUpdating(q.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(q.id)}`, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not delete request.");
      setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete request.");
    } finally {
      setUpdating(null);
    }
  };

  // Advance an instant-rent order: paid → shipped → returned → settled.
  const setFulfillment = async (id: string, fulfillment: string) => {
    setUpdating(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/quotes?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ fulfillment }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update.");
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, fulfillment_status: fulfillment as QuoteRequest["fulfillment_status"] } : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setUpdating(null);
    }
  };

  // E-Contracts / Invoicing only list rentals the client has agreed to.
  const visible = focus === "quotations" ? quotes : quotes.filter((q) => q.quotation_agreed_at);
  const COPY = {
    quotations: { title: "E-Quotations", sub: "Web requests + quotations you start for call / walk-in clients.", empty: "No quote requests yet." },
    contracts: { title: "E-Contracts", sub: "Agreed quotations ready to turn into a signed rental agreement.", empty: "Nothing here yet — mark a quotation agreed under E-Quotations, or use “New contract” for an off-site order." },
    invoicing: { title: "Invoicing", sub: "Agreed rentals — issue invoices, record deposits & payments, track balances.", empty: "Nothing here yet — mark a quotation agreed under E-Quotations, or use “New invoice” for an off-site order." },
  }[focus];

  return (
    <div className="surface" style={{ padding: 18, border: "1px solid rgba(17,17,17,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>{COPY.title}</h2>
          <p style={{ margin: "2px 0 0", color: "#6c675f", fontSize: 13 }}>{COPY.sub}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setCreating(true)} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}>
            <Plus size={14} /> {focus === "contracts" ? "New contract" : focus === "invoicing" ? "New invoice" : "New quotation"}
          </button>
          <button onClick={loadQuotes} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      {!loading && !error && visible.length === 0 && <p style={{ color: "#6c675f", fontSize: 13 }}>{COPY.empty}</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((q) => {
          const total = Number(q.est_total) || 0;
          return (
            <article key={q.id} style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {q.name}
                    {q.channel === "direct" && <span style={{ fontFamily: "inherit", fontSize: 11, fontWeight: 700, background: "#e7efe9", color: "#2f6b46", borderRadius: 999, padding: "2px 8px" }}>direct</span>}
                  </h3>
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
                  <span style={{ display: "inline-flex", borderRadius: 999, background: q.status === "pending" ? "#fff3c4" : q.status === "responded" ? "#dff0e4" : "#eceef2", color: "#15130f", padding: "5px 10px", fontSize: 12, fontWeight: 500 }}>
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

              <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
                {q.items.map((item, idx) => (
                  <div key={`${q.id}-${item.id ?? idx}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, color: "#15130f", fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 7 }}>
                    <span>{item.name || item.slug || item.id || "Item"}</span>
                    <span style={{ color: "#6c675f" }}>{item.qty ?? 1} x {item.days ?? 1} day(s)</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <p style={{ margin: 0, color: "#6c675f", fontSize: 13 }}>Reference individual total: <strong style={{ color: "#15130f" }}>{currency(total)}</strong></p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setBuilding(q)} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}>
                    <FileText size={14} /> {q.quotation_status && q.quotation_status !== "none" ? "Edit quotation" : "Build quotation"}
                  </button>
                  <a href={`mailto:${q.email}?subject=${encodeURIComponent(`VissionLink package quotation - ${q.id}`)}`} style={{ ...miniBtn, textDecoration: "none" }}>
                    <Mail size={14} /> Reply
                  </a>
                  {(["pending", "responded", "closed"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatus(q.id, status)}
                      disabled={updating === q.id || q.status === status}
                      style={{ ...miniBtn, opacity: updating === q.id || q.status === status ? 0.55 : 1 }}
                    >
                      {status}
                    </button>
                  ))}
                  <button onClick={() => deleteQuote(q)} disabled={updating === q.id} style={{ ...miniBtn, color: "#c0392b", opacity: updating === q.id ? 0.55 : 1 }} title="Delete this request and all its documents">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              {/* Downstream lifecycle: agree → contract → invoice. Shown once a
                  quotation has been built. */}
              {q.quotation_status && q.quotation_status !== "none" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(17,17,17,0.14)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#6c675f" }}>After client agrees →</span>
                  {!q.quotation_agreed_at ? (
                    <button onClick={() => setAgreed(q.id, true)} disabled={updating === q.id} style={{ ...miniBtn, background: "#2f6b46", color: "#fff", opacity: updating === q.id ? 0.6 : 1 }}>
                      <PackageCheck size={14} /> Mark agreed
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setBuildingContract(q)} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}>
                        <FileText size={14} /> {q.contract_status && q.contract_status !== "none" ? "Edit contract" : "Build contract"}
                      </button>
                      <button onClick={() => setBuildingInvoice(q)} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}>
                        <FileText size={14} /> {q.invoice_status && q.invoice_status !== "none" ? "Edit invoice" : "Build invoice"}
                      </button>
                      <button onClick={() => setAgreed(q.id, false)} disabled={updating === q.id} style={{ ...tinyBtn, color: "#6c675f" }} title="Undo agreed">undo</button>
                    </>
                  )}
                </div>
              )}

              {/* Instant-rent fulfillment: paid → shipped → returned → settled.
                  Shown on rent orders (those that carry a fulfillment status). */}
              {q.fulfillment_status && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(17,17,17,0.14)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#6c675f" }}><Truck size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Rental fulfillment</span>
                  <DocChip label={q.fulfillment_status.replace("_", " ")} on={q.fulfillment_status === "settled"} tone={q.fulfillment_status === "settled" ? "green" : undefined} />
                  {q.delivery_address && <span style={{ fontSize: 12, color: "#6c675f", display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {q.delivery_address}</span>}
                  {q.fulfillment_status === "paid" && (
                    <button onClick={() => setFulfillment(q.id, "shipped")} disabled={updating === q.id} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: updating === q.id ? 0.6 : 1 }}><Truck size={14} /> Mark shipped</button>
                  )}
                  {q.fulfillment_status === "shipped" && (
                    <button onClick={() => setFulfillment(q.id, "returned")} disabled={updating === q.id} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: updating === q.id ? 0.6 : 1 }}><CornerUpLeft size={14} /> Mark returned</button>
                  )}
                  {q.fulfillment_status === "returned" && (
                    <button onClick={() => { if (confirm("Settle this rental? Record any damage charges on the invoice first (the deposit absorbs them); the remaining deposit is then refunded off-app.")) void setFulfillment(q.id, "settled"); }} disabled={updating === q.id} style={{ ...miniBtn, background: "#2f6b46", color: "#fff", opacity: updating === q.id ? 0.6 : 1 }}><PackageCheck size={14} /> Settle</button>
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
        })}
      </div>

      {creating && (
        <QuotationCreateForm
          authCode={authCode}
          kind={focus === "invoicing" ? "invoice" : focus === "contracts" ? "contract" : "quotation"}
          onClose={() => setCreating(false)}
          onCreated={(request) => {
            setCreating(false);
            setQuotes((prev) => [request, ...prev]);
            if (focus === "quotations") {
              setBuilding(request); // jump straight into review/edit/sign
              return;
            }
            // Standalone contract / invoice: the new request already carries an
            // auto quotation draft, so mark it agreed (unlocks the downstream
            // doc) and open that editor directly.
            void setAgreed(request.id, true);
            const agreed = { ...request, quotation_agreed_at: new Date().toISOString() };
            if (focus === "contracts") setBuildingContract(agreed);
            else setBuildingInvoice(agreed);
          }}
        />
      )}

      {building && (
        <QuotationEditor
          request={building}
          authCode={authCode}
          onClose={() => setBuilding(null)}
          onSent={(id) => {
            setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status: "responded", quotation_status: "sent" } : q)));
            setBuilding(null);
          }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, quotation_status: q.quotation_status === "sent" ? "sent" : "draft" } : q)))}
          onDiscarded={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, quotation_status: "none", quotation_sent_at: null } : q)))}
        />
      )}

      {buildingContract && (
        <ContractEditor
          request={buildingContract}
          authCode={authCode}
          onClose={() => setBuildingContract(null)}
          onSent={(id) => { setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, contract_status: "sent" } : q))); setBuildingContract(null); }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, contract_status: q.contract_status && q.contract_status !== "none" ? q.contract_status : "draft" } : q)))}
          onDiscarded={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, contract_status: "none" } : q)))}
        />
      )}

      {buildingInvoice && (
        <InvoiceEditor
          request={buildingInvoice}
          authCode={authCode}
          onClose={() => setBuildingInvoice(null)}
          onSent={(id) => { setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, invoice_status: "sent" } : q))); setBuildingInvoice(null); }}
          onSaved={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, invoice_status: q.invoice_status === "sent" ? "sent" : "draft" } : q)))}
          onDiscarded={(id) => setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, invoice_status: "none" } : q)))}
        />
      )}
    </div>
  );
}

// ─── Manual quotation create form ─────────────────────────────────────────────
// For clients who reach out by phone or in person: the admin picks a package
// (optional — pre-fills rate-card lines) and fills client details, then creates
// the request + auto-draft and drops straight into the editor to review & sign.
function QuotationCreateForm({
  authCode,
  kind = "quotation",
  onClose,
  onCreated,
}: {
  authCode: string;
  kind?: "quotation" | "contract" | "invoice";
  onClose: () => void;
  onCreated: (request: QuoteRequest) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", project: "", dateFrom: "", dateTo: "", notes: "", packageSlug: "" });
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
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>New {kind}</h2>
          <button onClick={onClose} style={{ ...tinyBtn, padding: 6, borderRadius: 999 }} aria-label="Close"><X size={16} /></button>
        </div>
        <p style={{ margin: "0 0 14px", color: "#6c675f", fontSize: 13 }}>
          For an order that didn&apos;t come through the site (call / walk-in client). Pick a package to pre-fill lines, then review &amp; {kind === "quotation" ? "sign" : `build the ${kind}`} in the next step.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <LabeledField label="Package (optional — pre-fills equipment lines)">
            <select value={form.packageSlug} onChange={(e) => set("packageSlug", e.target.value)} style={editInput}>
              <option value="">No package — start blank</option>
              {PACKAGE_OFFERS.map((o) => (
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
  const [message, setMessage] = useState("");
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

  const send = async () => {
    if (!doc) return;
    if (!confirm(`Send quotation ${doc.number} to ${doc.client.email}? The client will receive the PDF by email.`)) return;
    setBusy("send");
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/quotations?requestId=${encodeURIComponent(request.id)}`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ doc, message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send.");
      if (data.emailSkipped) {
        setNotice("Saved and marked sent, but email is not configured — the client was not emailed.");
        onSaved(request.id);
      } else {
        onSent(request.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(10,9,7,0.55)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "32px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="surface" style={{ width: "100%", maxWidth: 760, background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.14)", borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>Quotation{doc ? ` · ${doc.number}` : ""}</h2>
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

            <LabeledField label="Message to client (optional, included in the email body)"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="A short note to accompany the quotation…" style={{ ...editInput, resize: "vertical" }} /></LabeledField>

            {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button onClick={discard} disabled={busy !== null} style={{ ...miniBtn, color: "#c0392b", marginRight: "auto", opacity: busy ? 0.6 : 1 }} title="Delete this draft and its stored PDF">
                <Trash2 size={14} /> Discard
              </button>
              <button onClick={preview} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }} title="Opens the PDF in a new tab — print or save from there">
                {busy === "preview" ? <Loader2 size={14} className="spin" /> : <Eye size={14} />} Preview / Print PDF
              </button>
              <button onClick={save} disabled={busy !== null} style={{ ...miniBtn, opacity: busy ? 0.6 : 1 }}>
                {busy === "save" ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save draft
              </button>
              <button onClick={send} disabled={busy !== null} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>
                {busy === "send" ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send to client
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
function DocChip({ label, on, tone }: { label: string; on?: boolean; tone?: "green" }) {
  const bg = tone === "green" ? "#e7efe9" : on ? "#15130f" : "#f0ece3";
  const fg = tone === "green" ? "#2f6b46" : on ? "#ffcc00" : "#6c675f";
  return <span style={{ display: "inline-flex", borderRadius: 999, background: bg, color: fg, padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>{label}</span>;
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
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ ...tinyBtn, padding: 6, borderRadius: 999 }} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Action footer shared by contract & invoice editors.
function DocActions({ busy, onPreview, onSave, onSend, onDiscard }: { busy: "save" | "send" | "preview" | null; onPreview: () => void; onSave: () => void; onSend: () => void; onDiscard?: () => void }) {
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
        {busy === "save" ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save draft
      </button>
      <button onClick={onSend} disabled={busy !== null} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00", opacity: busy ? 0.6 : 1 }}>
        {busy === "send" ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Send to client
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

function ClientsPanel({ authCode }: { authCode: string }) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const headers = useCallback(() => ({ Authorization: `Bearer ${authCode}` }), [authCode]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/clients", { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load clients.");
      setClients(Array.isArray(data) ? data : []);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load clients."); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const act = async (email: string, body: Record<string, unknown>) => {
    setBusy(email); setError("");
    try {
      const res = await fetch(`/api/admin/clients?email=${encodeURIComponent(email)}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not update.");
      setClients((prev) => prev.map((c) => (c.email === email ? { ...c, ...data.client, policy: data.policy } : c)));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update."); }
    finally { setBusy(null); }
  };

  const removeClient = async (email: string) => {
    if (!confirm(`Delete ${email} from the client ledger? Their tier/standing rebuild from invoices on the next clean settlement.`)) return;
    setBusy(email); setError("");
    try {
      const res = await fetch(`/api/admin/clients?email=${encodeURIComponent(email)}`, { method: "DELETE", headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not delete client.");
      setClients((prev) => prev.filter((c) => c.email !== email));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not delete client."); }
    finally { setBusy(null); }
  };

  return (
    <div className="surface" style={{ padding: 18, border: "1px solid rgba(17,17,17,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>Clients</h2>
          <p style={{ margin: "2px 0 0", color: "#6c675f", fontSize: 13 }}>Loyalty tier + standing drive deposit size, PDC eligibility, and loyalty discount.</p>
        </div>
        <button onClick={load} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
      </div>
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      {!loading && clients.length === 0 && <p style={{ color: "#6c675f", fontSize: 13 }}>No clients yet — they appear here after their first quotation request.</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {clients.map((c) => (
          <article key={c.email} style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 18, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {c.name || c.email}
                  <DocChip label={c.policy.tierLabel} on />
                  <DocChip label={c.standing} on={c.standing !== "good"} tone={c.standing === "good" ? "green" : undefined} />
                </h3>
                <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 13 }}>{c.email}{c.company ? ` · ${c.company}` : ""}{c.phone ? ` · ${c.phone}` : ""}</p>
                <p style={{ margin: "4px 0 0", color: "#6c675f", fontSize: 12 }}>
                  {c.clean_paid_count} clean rentals · spent {formatPHP(Number(c.total_spent) || 0)} · {c.bounced_count} bounced · {c.late_count} late
                </p>
                <p style={{ margin: "4px 0 0", color: "#3a362f", fontSize: 12 }}>
                  Policy: loyalty {Math.round(c.policy.loyaltyRate * 100)}% · deposit {Math.round(c.policy.depositRate * 100)}% · PDC {c.policy.pdcAllowed ? "allowed" : "no"}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {(["good", "watch", "blocked"] as const).map((s) => (
                    <button key={s} onClick={() => act(c.email, { standing: s })} disabled={busy === c.email || c.standing === s} style={{ ...tinyBtn, opacity: busy === c.email || c.standing === s ? 0.5 : 1 }}>{s}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { if (confirm("Record a LATE settlement? Demotes to watch and resets the loyalty streak.")) void act(c.email, { delinquency: "late" }); }} disabled={busy === c.email} style={{ ...tinyBtn, color: "#c0392b" }}>+ late</button>
                  <button onClick={() => { if (confirm("Record a BOUNCED cheque? Demotes to watch and resets the loyalty streak.")) void act(c.email, { delinquency: "bounced" }); }} disabled={busy === c.email} style={{ ...tinyBtn, color: "#c0392b" }}>+ bounced</button>
                  <button onClick={() => removeClient(c.email)} disabled={busy === c.email} style={{ ...tinyBtn, color: "#c0392b" }} aria-label="Delete client"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
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
      revenue += money.paid; receivables += money.balance; deposits += money.depositReceived;
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
      <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </button>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {card("Revenue collected", formatPHP(m.revenue), "accounting", true)}
        {card("Receivables outstanding", formatPHP(m.receivables), "invoicing")}
        {card("Deposits held", formatPHP(m.deposits))}
        {card("Open requests", String(m.openRequests), "quotations")}
        {card("Quotations sent", String(m.quotationsSent), "quotations")}
        {card("Contracts", String(m.contracts), "contracts")}
        {card("Open invoices", String(m.invoicesOpen), "invoicing")}
        {card("Clients", String(clients.length), "clients")}
        {card("Live listings", String(listingCount))}
      </div>
      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: '"Jost", sans-serif', margin: "0 0 8px" }}>Quick start</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setView("quotations")} style={{ ...miniBtn, background: "#15130f", color: "#ffcc00" }}><FileText size={14} /> New / manage quotations</button>
          <button onClick={() => setView("invoicing")} style={miniBtn}><Receipt size={14} /> Invoicing & payments</button>
          <button onClick={() => setView("accounting")} style={miniBtn}><Calculator size={14} /> Accounting</button>
          <button onClick={() => setView("inventory")} style={miniBtn}><Boxes size={14} /> Inventory</button>
          <button onClick={() => setView("monitoring")} style={miniBtn}><Radio size={14} /> Equipment monitoring</button>
        </div>
      </div>
    </div>
  );
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
    let revenue = 0, receivables = 0, deposits = 0, incidents = 0;
    const rows: { number: string; client: string; paid: number; balance: number }[] = [];
    for (const r of rentals) {
      if (!r.invoice) continue;
      const m = computeInvoiceMoney(r.invoice);
      revenue += m.paid; receivables += m.balance; deposits += m.depositReceived; incidents += m.incidentsTotal;
      rows.push({ number: r.invoice.number, client: r.invoice.client.name || r.email, paid: m.paid, balance: m.balance });
    }
    return { revenue, receivables, deposits, incidents, rows };
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
      <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, fontWeight: 800, marginTop: 4, color }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {stat("Revenue collected", formatPHP(income.revenue), "#2f6b46")}
        {stat("Receivables", formatPHP(income.receivables), "#b06a00")}
        {stat("Deposits held", formatPHP(income.deposits))}
        {stat("Expenses", formatPHP(expenseTotal), "#c0392b")}
        {stat("Net (P&L)", formatPHP(net), net >= 0 ? "#2f6b46" : "#c0392b")}
      </div>

      <div className="surface" style={{ padding: 16, border: "1px solid rgba(17,17,17,0.1)" }}>
        <h3 style={{ fontFamily: '"Jost", sans-serif', margin: "0 0 10px" }}>{editingId ? "Edit expense" : "Record an expense"}</h3>
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
        <h3 style={{ fontFamily: '"Jost", sans-serif', margin: "0 0 10px" }}>Invoice income</h3>
        {income.rows.length === 0 ? <p style={{ color: "#6c675f", fontSize: 13, margin: 0 }}>No invoices yet.</p> : (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px", gap: 8, fontSize: 11, color: "#6c675f", fontWeight: 700 }}>
              <span>Invoice</span><span>Client</span><span style={{ textAlign: "right" }}>Collected</span><span style={{ textAlign: "right" }}>Balance</span>
            </div>
            {income.rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 120px", gap: 8, fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6 }}>
                <span>{r.number}</span><span>{r.client}</span>
                <span style={{ textAlign: "right", color: "#2f6b46", fontWeight: 700 }}>{formatPHP(r.paid)}</span>
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
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
          <h3 style={{ fontFamily: '"Jost", sans-serif', margin: 0 }}>Availability by type</h3>
          <button onClick={reload} disabled={loading} style={{ ...miniBtn, opacity: loading ? 0.6 : 1 }}>{loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh</button>
        </div>
        <p style={{ color: "#6c675f", fontSize: 12, marginTop: 0 }}>Auto-updates as units are checked out under Equipment Monitoring.</p>
        {byType.length === 0 ? <p style={{ color: "#6c675f", fontSize: 13 }}>No units registered yet — add them under Equipment Monitoring.</p> : (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 90px", gap: 8, fontSize: 11, color: "#6c675f", fontWeight: 700 }}>
              <span>Type</span><span style={{ textAlign: "right" }}>Total</span><span style={{ textAlign: "right" }}>Available</span><span style={{ textAlign: "right" }}>Rented</span><span style={{ textAlign: "right" }}>Maint.</span>
            </div>
            {byType.map(([name, e]) => (
              <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 80px 90px", gap: 8, fontSize: 13, borderBottom: "1px solid rgba(17,17,17,0.08)", paddingBottom: 6 }}>
                <span>{name}</span>
                <span style={{ textAlign: "right" }}>{e.total}</span>
                <span style={{ textAlign: "right", color: "#2f6b46", fontWeight: 700 }}>{e.available}</span>
                <span style={{ textAlign: "right", color: "#b06a00" }}>{e.rented}</span>
                <span style={{ textAlign: "right" }}>{e.maintenance}</span>
              </div>
            ))}
          </div>
        )}
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
        <h3 style={{ fontFamily: '"Jost", sans-serif', margin: "0 0 4px" }}>Register a unit</h3>
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
          <h3 style={{ fontFamily: '"Jost", sans-serif', margin: 0 }}>Units</h3>
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
          <strong style={{ fontFamily: '"Jost", sans-serif' }}>Equipment units</strong>
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
  const { doc, setDoc, loading, error, busy, notice, save, preview, send, discard } = useDocEditor<ContractDoc>("/api/admin/contracts", request.id, authCode, normalize);
  const [message, setMessage] = useState("");
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

          <LabeledField label="Message to client (optional, included in the email body)"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>
          {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}
          <DocActions busy={busy} onPreview={preview} onSave={() => save(() => onSaved(request.id))} onSend={() => { if (confirm(`Send contract ${doc.number} to ${doc.client.email}?`)) void send(message, () => onSent(request.id), () => onSaved(request.id)); }} onDiscard={() => { if (confirm(`Discard contract ${doc.number}? The draft and its stored PDF are deleted; you can rebuild it from the agreed quotation.`)) void discard(() => { onDiscarded(request.id); onClose(); }); }} />
        </div>
      )}
    </DocModal>
  );
}

// ─── Invoice editor ───────────────────────────────────────────────────────────
function InvoiceEditor({ request, authCode, onClose, onSent, onSaved, onDiscarded }: { request: QuoteRequest; authCode: string; onClose: () => void; onSent: (id: string) => void; onSaved: (id: string) => void; onDiscarded: (id: string) => void }) {
  const normalize = useCallback((d: InvoiceDoc) => ({ ...d, laborLines: d.laborLines ?? [], payments: d.payments ?? [], incidents: d.incidents ?? [], acceptedChannels: d.acceptedChannels ?? [...ALL_CHANNELS] }), []);
  const { doc, setDoc, loading, error, busy, notice, meta, save, preview, send, discard } = useDocEditor<InvoiceDoc>("/api/admin/invoices", request.id, authCode, normalize);
  const [message, setMessage] = useState("");
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

          <LabeledField label="Message to client (optional, included in the email body)"><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} style={{ ...editInput, resize: "vertical" }} /></LabeledField>
          {notice && <p style={{ color: "#15130f", background: "rgba(245,197,24,0.22)", padding: 10, borderRadius: 10, fontSize: 13, margin: 0 }}>{notice}</p>}
          <DocActions busy={busy} onPreview={preview} onSave={() => save(() => onSaved(request.id))} onSend={() => { if (confirm(`Send invoice ${doc.number} to ${doc.client.email}?`)) void send(message, () => onSent(request.id), () => onSaved(request.id)); }} onDiscard={() => { if (confirm(`Discard invoice ${doc.number}? The draft and its stored PDF are deleted; you can rebuild it from the agreed quotation.`)) void discard(() => { onDiscarded(request.id); onClose(); }); }} />
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
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, margin: 0 }}>Inbox</h2>
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
              <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 6px" }}>{selected.subject}</h3>
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
