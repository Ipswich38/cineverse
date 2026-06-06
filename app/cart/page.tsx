"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { useStore } from "../providers";
import { peso, DOWNPAYMENT_RATE } from "@/lib/rental-pricing";

export default function CartPage() {
  const { cart, setDays, setQuantity, removeFromCart, clearCart, subtotal, downpaymentTotal, balanceTotal } = useStore();

  return (
    <div className="app-container" style={{ padding: "22px 0 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 18 }}>
        <div>
          <p className="section-kicker">Cart</p>
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, margin: "6px 0 0", letterSpacing: "-0.04em" }}>Your rental</h1>
        </div>
        <Link href={{ pathname: "/contact", query: { type: "quote" } }} style={{ textDecoration: "none", color: "#15130f", fontWeight: 700, padding: "10px 18px", borderRadius: 999, display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, border: "1px solid rgba(17,17,17,0.2)" }}>
          <FileText size={15} /> Need a custom quote?
        </Link>
      </div>

      <div className="cart-layout">
        <div style={{ padding: 0 }}>
          {cart.length === 0 ? (
            <div style={{ padding: 24, color: "#6c675f" }}>
              Your cart is empty. Browse the <Link href="/store">catalog</Link> or <Link href="/providers">packages</Link> and hit <strong>Rent</strong>.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {cart.map((item) => (
                <div key={`${item.itemId}-${item.days}`} className="cart-item-row" style={{ paddingBottom: 14, borderBottom: "1px solid rgba(17,17,17,0.12)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 0 }} />
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 22, margin: 0 }}>{item.name}</h3>
                        <p style={{ color: "#6c675f", margin: "6px 0 0", fontSize: 13 }}>{peso(item.ratePerDay)}/day</p>
                      </div>
                      <button onClick={() => removeFromCart(item.itemId)} style={{ background: "none", border: "none", color: "#ff5858" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, alignItems: "end" }}>
                      <StepControl label="Days" value={item.days} onDec={() => setDays(item.itemId, Math.max(1, item.days - 1))} onInc={() => setDays(item.itemId, item.days + 1)} />
                      <StepControl label="Qty" value={item.quantity} onDec={() => setQuantity(item.itemId, Math.max(1, item.quantity - 1))} onInc={() => setQuantity(item.itemId, item.quantity + 1)} />
                      <div style={{ marginLeft: "auto", textAlign: "right" }}>
                        <span style={{ color: "#6c675f", fontSize: 12 }}>Line subtotal</span>
                        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 800, fontSize: 18 }}>{peso(item.ratePerDay * item.days * item.quantity)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={clearCart} style={{ marginTop: 6, alignSelf: "flex-start", background: "none", border: "1px solid rgba(17,17,17,0.16)", color: "#15130f", borderRadius: 999, padding: "8px 16px", fontSize: 13 }}>
                Clear cart
              </button>
            </div>
          )}
        </div>

        <aside style={{ padding: 16, border: "1px solid rgba(17,17,17,0.12)", background: "#fffdf8", height: "fit-content" }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: 0 }}>Summary</h2>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <SummaryRow label="Rental subtotal" value={peso(subtotal)} />
            <SummaryRow label={`Downpayment to reserve (${Math.round(DOWNPAYMENT_RATE * 100)}%)`} value={peso(downpaymentTotal)} />
            <SummaryRow label="Balance — settled later" value={peso(balanceTotal)} />
            <div style={{ height: 1, background: "rgba(17,17,17,0.12)" }} />
            <SummaryRow label="Pay now" value={peso(downpaymentTotal)} bold />
          </div>
          <p style={{ display: "flex", gap: 7, color: "#6c675f", fontSize: 12, lineHeight: 1.5, margin: "12px 0 0" }}>
            <ShieldCheck size={26} style={{ flexShrink: 0, marginTop: -2 }} /> Pay just {Math.round(DOWNPAYMENT_RATE * 100)}% now to reserve your gear — the balance is settled before or upon handover. Invoice + rental contract are emailed once payment clears.
          </p>
          <Link
            href="/checkout"
            aria-disabled={cart.length === 0}
            style={{ marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: cart.length ? "#f5c518" : "#e3ddd2", color: "#15130f", textDecoration: "none", fontWeight: 800, borderRadius: 999, padding: "12px 14px", fontSize: 14, pointerEvents: cart.length ? "auto" : "none" }}
          >
            Proceed to checkout <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function StepControl({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#6c675f", fontSize: 12 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)", borderRadius: 0, padding: 8 }}>
        <button onClick={onDec} style={{ background: "none", color: "#15130f", border: "none" }}><Minus size={14} /></button>
        <span style={{ minWidth: 20, textAlign: "center" }}>{value}</span>
        <button onClick={onInc} style={{ background: "none", color: "#15130f", border: "none" }}><Plus size={14} /></button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: bold ? "#15130f" : "#6c675f", fontWeight: bold ? 800 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 700, fontSize: bold ? 18 : 14 }}>{value}</span>
    </div>
  );
}
