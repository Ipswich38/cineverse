'use client'

import { useState } from 'react'
import { Minus, Plus, ShieldCheck, ShoppingCart, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart, DOWNPAYMENT_PCT } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { formatMoney } from '@/lib/storefront'

export default function ListingBooking({ product }: { product: Product }) {
  const { addItem, openCart } = useCart()
  const [days, setDays] = useState(1)
  const [qty, setQty] = useState(1)
  const [withOperator, setWithOperator] = useState(false)

  const operatorAvailable = Boolean(product.operator_available)
  const operatorDayRate = product.operator_day_rate ?? 0
  const rental = product.price * qty * days
  const operatorFee = withOperator && operatorAvailable ? operatorDayRate * days : 0
  const total = rental + operatorFee
  const downpayment = Math.round(total * DOWNPAYMENT_PCT)

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      tags: product.tags ?? [],
      ownerName: product.owner_name ?? undefined,
      operatorAvailable,
      operatorDayRate: operatorAvailable ? operatorDayRate : undefined,
      days,
      withOperator: withOperator && operatorAvailable,
    })
    // addItem starts at quantity 1; bump to the chosen quantity.
    if (qty > 1) {
      const { updateQuantity } = useCart.getState()
      updateQuantity(product.id, qty)
    }
    toast.success('Added to cart')
    openCart()
  }

  const soldOut = product.stock === 0

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-[0_10px_40px_-20px_rgba(17,24,39,0.25)]">
      {/* Trust */}
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#FFF7DB] px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#C5A059]" />
        <p className="text-[11px] font-medium text-[#111827]">Certified bench-tested · Verified owner · Secure 30% reservation</p>
      </div>
      {/* Duration */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">Rental duration</p>
          <p className="text-[12px] text-[#6b7280]">Number of days</p>
        </div>
        <Stepper value={days} min={1} onChange={setDays} label="days" />
      </div>

      <div className="my-4 h-px bg-black/[0.06]" />

      {/* Units */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[#111827]">Units</p>
          <p className="text-[12px] text-[#6b7280]">{product.stock} available</p>
        </div>
        <Stepper value={qty} min={1} max={Math.max(product.stock, 1)} onChange={setQty} label="units" />
      </div>

      {/* Operator add-on */}
      {operatorAvailable && (
        <>
          <div className="my-4 h-px bg-black/[0.06]" />
          <button
            type="button"
            onClick={() => setWithOperator((v) => !v)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              withOperator ? 'border-[#FFCC00] bg-[#FFCC00]/[0.04]' : 'border-black/[0.08] hover:border-black/20'
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${withOperator ? 'border-[#FFCC00] bg-[#FFCC00] text-[#111827]' : 'border-black/20'}`}>
              {withOperator && <span className="text-[11px] leading-none">✓</span>}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                <UserCog className="h-3.5 w-3.5 text-[#C5A059]" />
                Add a trained operator
              </span>
              <span className="mt-0.5 block text-[12px] text-[#6b7280]">
                {formatMoney(operatorDayRate)}/day — let the owner run the gear on your shoot.
              </span>
            </span>
          </button>
        </>
      )}

      <div className="my-4 h-px bg-black/[0.06]" />

      {/* Price preview */}
      <div className="space-y-1.5 text-[13px]">
        <div className="flex justify-between text-[#6b7280]">
          <span>{formatMoney(product.price)} × {qty} × {days}d</span>
          <span className="text-[#111827]">{formatMoney(rental)}</span>
        </div>
        {operatorFee > 0 && (
          <div className="flex justify-between text-[#6b7280]">
            <span>Operator × {days}d</span>
            <span className="text-[#111827]">{formatMoney(operatorFee)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 text-[15px] font-semibold text-[#111827]">
          <span>Rental total</span>
          <span>{formatMoney(total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between rounded-xl border-l-2 border-[#FFCC00] bg-[#FFF7DB] px-3 py-2.5 text-[13px] font-semibold text-[#111827]">
          <span>Pay now · 30% downpayment</span>
          <span>{formatMoney(downpayment)}</span>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handleAdd}
        disabled={soldOut}
        className="mt-5 h-12 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800] disabled:opacity-40"
      >
        <ShoppingCart className="h-4 w-4" />
        {soldOut ? 'Fully booked' : 'Reserve equipment'}
      </Button>
      <p className="mt-3 text-center text-[11px] text-[#6b7280]">
        CineVerse handles delivery, pickup, and return — we coordinate everything end-to-end.
      </p>
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number
  min: number
  max?: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center text-[14px] font-semibold text-[#111827]">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}
