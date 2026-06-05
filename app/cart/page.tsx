"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useStore } from "../providers";

export default function CartPage() {
  const { cart, setDays, setQuantity, removeFromCart, clearCart } = useStore();

  return (
    <div className="app-container" style={{ padding: "22px 0 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 18 }}>
        <div>
          <p className="section-kicker">Cart</p>
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 28, margin: "6px 0 0", letterSpacing: "-0.04em" }}>Quotation list</h1>
        </div>
        <Link href="/packages" style={{ textDecoration: "none", background: "#f5c518", color: "#15130f", fontWeight: 800, padding: "10px 18px", borderRadius: 999, display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          Request quotation <ArrowRight size={16} />
        </Link>
      </div>

      <div className="cart-layout">
        <div style={{ padding: 0 }}>
          {cart.length === 0 ? (
            <div style={{ padding: 24, color: "#6c675f" }}>
              Cart checkout is being replaced by quotation requests. Start with <Link href="/packages">Packages</Link> or browse the <Link href="/store">catalog</Link>.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {cart.map((item) => (
                <div key={`${item.itemId}-${item.days}`} className="cart-item-row" style={{ paddingBottom: 14, borderBottom: "1px solid rgba(17,17,17,0.12)" }}>
                  <img src={item.image} alt={item.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 0 }} />
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 22, margin: 0 }}>{item.name}</h3>
                        <p style={{ color: "#6c675f", margin: "6px 0 0" }}>{item.owner}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.itemId)} style={{ background: "none", border: "none", color: "#ff5858" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                      <StepControl label="Days" value={item.days} onDec={() => setDays(item.itemId, Math.max(1, item.days - 1))} onInc={() => setDays(item.itemId, item.days + 1)} />
                      <StepControl label="Qty" value={item.quantity} onDec={() => setQuantity(item.itemId, Math.max(1, item.quantity - 1))} onInc={() => setQuantity(item.itemId, item.quantity + 1)} />
                    </div>
                    <p style={{ marginTop: 14, color: "#6c675f" }}>Pricing is reviewed by admin before confirmation.</p>
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
            <SummaryRow label="Items listed" value={`${cart.length}`} />
            <SummaryRow label="Pricing" value="Quoted by admin" />
            <SummaryRow label="Payment" value="After confirmation" />
          </div>
          <Link href="/packages" style={{ marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, background: "#f5c518", color: "#15130f", textDecoration: "none", fontWeight: 800, borderRadius: 999, padding: "12px 14px", fontSize: 13 }}>
            Ask a quotation
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#6c675f" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
