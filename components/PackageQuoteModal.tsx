"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Check, Send, X } from "lucide-react";
import type { PackageOffer } from "@/lib/package-offers";

const initialForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  project: "",
  dateFrom: "",
  dateTo: "",
  notes: "",
  additionalRequests: "",
};

export function PackageQuoteButton({ offer, className = "quote-button", children = "Ask a quotation" }: { offer: PackageOffer; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Send size={15} /> {children}
      </button>
      {open && <PackageQuoteModal offer={offer} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function PackageQuoteModal({ offer, onClose }: { offer: PackageOffer; onClose: () => void }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const close = () => {
    if (status !== "sending") onClose();
  };

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setErrMsg("Please add your name and email so we can respond to your quotation request.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrMsg("");
    try {
      const notes = [
        form.notes.trim() ? `Project notes: ${form.notes.trim()}` : "",
        form.additionalRequests.trim() ? `Additional requests: ${form.additionalRequests.trim()}` : "",
      ].filter(Boolean).join("\n\n");

      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          project: form.project || offer.name,
          dateFrom: form.dateFrom,
          dateTo: form.dateTo,
          notes,
          estTotal: 0,
          items: [
            {
              id: offer.id,
              slug: offer.slug,
              name: offer.name,
              qty: 1,
              days: 1,
              ratePerDay: 0,
              inclusions: offer.inclusions,
              priceRange: offer.priceRange,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send your quotation request.");
      setStatus("sent");
      setForm(initialForm);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Could not send your quotation request.");
      setStatus("error");
    }
  };

  return (
    <div className="quote-modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="quote-modal" role="dialog" aria-modal="true" aria-labelledby="quote-title" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={close} aria-label="Close quotation form">
          <X size={18} />
        </button>

        {status === "sent" ? (
          <div className="sent-state">
            <Check size={34} />
            <h2 id="quote-title">Quotation request sent</h2>
            <p>
              Thanks. Your package request was sent to the admin for review. The fastest response is usually within the same business day, depending on shoot details and availability.
            </p>
            <button type="button" className="quote-button" onClick={close}>Done</button>
          </div>
        ) : (
          <>
            <p className="packages-eyebrow">Ask a quotation</p>
            <h2 id="quote-title">{offer.name}</h2>
            <p className="modal-copy">
              Share the shoot details and any extra requests. No payment is collected here; admin will review the package and respond with custom pricing.
            </p>

            <div className="form-grid">
              <input value={form.name} onChange={set("name")} placeholder="Your name *" style={inputStyle} />
              <input value={form.email} onChange={set("email")} placeholder="Email *" style={inputStyle} />
              <input value={form.phone} onChange={set("phone")} placeholder="Phone / Viber" style={inputStyle} />
              <input value={form.company} onChange={set("company")} placeholder="Company (optional)" style={inputStyle} />
              <input value={form.project} onChange={set("project")} placeholder="Project name (optional)" style={inputStyle} />
              <div className="date-row">
                <input type="date" value={form.dateFrom} onChange={set("dateFrom")} style={inputStyle} title="From" />
                <input type="date" value={form.dateTo} onChange={set("dateTo")} style={inputStyle} title="To" />
              </div>
              <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Shoot details, location, schedule, crew needs..." style={inputStyle} />
              <textarea value={form.additionalRequests} onChange={set("additionalRequests")} rows={3} placeholder="Additional requests" style={inputStyle} />
            </div>

            <p className="modal-disclaimer">
              Pricing may vary after review based on package scope, rental dates, location, transportation, crew requirements, taxes, and availability.
            </p>
            {status === "error" && <p className="form-error">{errMsg}</p>}
            <button type="button" onClick={submit} disabled={status === "sending"} className="quote-button modal-submit">
              <Send size={15} /> {status === "sending" ? "Sending..." : "Send quotation request"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: "#fffdf8",
  color: "#15130f",
  border: "1px solid rgba(17,17,17,0.16)",
  borderRadius: 10,
  padding: "11px 12px",
  outline: "none",
  fontSize: 14,
  width: "100%",
};
