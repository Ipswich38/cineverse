"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CornerUpLeft, Loader2, LockKeyhole, Mail, Plus, RefreshCw, Send, Shield, Trash2 } from "lucide-react";
import { useStore } from "../providers";
import { slugify, type EquipmentItem } from "@/lib/catalog";

const ADMIN_CODE = "vissionlink-admin";

export default function AdminPage() {
  const { catalog, refreshCatalog } = useStore();
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [view, setView] = useState<"ops" | "inbox">("ops");
  const [busy, setBusy] = useState(false);

  const approvedCount = useMemo(() => catalog.length, [catalog]);

  const saveEquipment = async (item: EquipmentItem, mode: "POST" | "PUT") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/equipment", {
        method: mode,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_CODE}` },
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
        headers: { Authorization: `Bearer ${ADMIN_CODE}` },
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
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 34, margin: "12px 0 10px" }}>Admin access</h1>
          <p style={{ color: "#6c675f" }}>Use the private code to manage inventory listings and the customer inbox.</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Admin code" style={inputStyle} />
          <button onClick={() => setUnlocked(code === ADMIN_CODE)} style={{ marginTop: 14, background: "#f1f1ee", color: "#111", border: "none", borderRadius: 999, padding: "14px 22px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <LockKeyhole size={16} /> Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {([["ops", "Operations"], ["inbox", "Inbox"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "9px 16px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: view === key ? "#15130f" : "#f0ece3",
              color: view === key ? "#fffdf8" : "#15130f",
            }}
          >
            {key === "inbox" ? <Mail size={15} /> : <Shield size={15} />}
            {label}
          </button>
        ))}
      </div>

      {view === "inbox" && <InboxPanel authCode={ADMIN_CODE} />}

      {view === "ops" && (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14, marginBottom: 18 }}>
        <Metric label="Live listings" value={`${approvedCount}`} />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <section className="surface" style={{ padding: 18, borderRadius: 20 }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, marginTop: 0 }}>Inventory manager</h2>
          <InventoryForm
            key={editing?.id ?? "new"}
            initial={editing}
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
                  <div style={{ color: "#6c675f", fontSize: 13 }}>{item.category} · {item.owner}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
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
    </div>
  );
}

function InventoryForm({
  initial,
  onSave,
  onClear,
}: {
  initial: EquipmentItem | null;
  onSave: (item: EquipmentItem) => void;
  onClear: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Camera");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [ratePerDay, setRatePerDay] = useState(String(initial?.ratePerDay ?? 0));
  const [securityDeposit, setSecurityDeposit] = useState(String(initial?.securityDeposit ?? 0));
  const [stock, setStock] = useState(String(initial?.stock ?? 1));
  const [image, setImage] = useState(initial?.images[0] ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
        {[
          ["Name", name, setName],
          ["Category", category, setCategory],
          ["Owner", owner, setOwner],
          ["Location", location, setLocation],
          ["Rate/day", ratePerDay, setRatePerDay],
          ["Deposit", securityDeposit, setSecurityDeposit],
          ["Stock", stock, setStock],
          ["Image URL", image, setImage],
        ].map(([label, value, setter]) => (
          <Field key={label as string} label={label as string} value={value as string} onChange={setter as (value: string) => void} />
        ))}
      </div>
      <Field label="Description" value={description} onChange={setDescription} textarea />
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => {
            const item: EquipmentItem = {
              id: initial?.id ?? `item-${slugify(name)}-${Date.now()}`,
              slug: slugify(name),
              name,
              category,
              description,
              owner,
              location,
              ratePerDay: Number(ratePerDay),
              securityDeposit: Number(securityDeposit),
              stock: Number(stock),
              featured: false,
              images: [image],
              specs: [owner, location].filter(Boolean),
              tags: [category.toLowerCase()],
            };
            onSave(item);
          }}
          style={miniBtn}
        >
          <Plus size={14} /> Save
        </button>
        {initial && (
          <button onClick={onClear} style={miniBtn}>Cancel</button>
        )}
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
      if (!res.ok) throw new Error(data.error || "Could not load inbox.");
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
    </div>
  );
}
