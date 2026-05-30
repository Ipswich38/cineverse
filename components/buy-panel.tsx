'use client'

import { useState } from 'react'
import { Minus, Plus, ShieldCheck, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart, SALE_DELIVERY_FEE_PER_SELLER } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { formatMoney } from '@/lib/storefront'

export default function BuyPanel({ product }: { product: Product }) {
  const { addItem, openCart } = useCart()
  const [qty, setQty] = useState(1)
  const salePrice = product.sale_price ?? 0
  const subtotal = salePrice * qty
  const soldOut = product.stock === 0

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
      mode: 'buy',
      salePrice,
    })
    if (qty > 1) useCart.getState().updateQuantity(product.id, qty)
    toast.success('Added to cart')
    openCart()
  }

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-[0_10px_40px_-20px_rgba(17,24,39,0.25)]">
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-[#FFF7DB] px-3 py-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#C5A059]" />
        <p className="text-[11px] font-medium text-[#111827]">Buy outright · Certified bench-tested · Paid securely via CineVerse</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Buy now</p>
          <p className="mt-0.5 text-[22px] font-bold leading-none text-[#111827]">{formatMoney(salePrice)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-[14px] font-semibold text-[#111827]">{qty}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty((q) => Math.min(Math.max(product.stock, 1), q + 1))} aria-label="Increase quantity">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="my-4 h-px bg-black/[0.06]" />

      <div className="space-y-1.5 text-[13px]">
        <div className="flex justify-between text-[#6b7280]"><span>{formatMoney(salePrice)} × {qty}</span><span className="text-[#111827]">{formatMoney(subtotal)}</span></div>
        <div className="flex justify-between text-[#6b7280]"><span>Delivery (one-way)</span><span className="text-[#111827]">{formatMoney(SALE_DELIVERY_FEE_PER_SELLER)}</span></div>
        <div className="flex justify-between pt-1 text-[15px] font-semibold text-[#111827]"><span>Total</span><span>{formatMoney(subtotal + SALE_DELIVERY_FEE_PER_SELLER)}</span></div>
      </div>

      <Button
        size="lg"
        onClick={handleAdd}
        disabled={soldOut}
        className="mt-5 h-12 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800] disabled:opacity-40"
      >
        <ShoppingBag className="h-4 w-4" />
        {soldOut ? 'Sold out' : 'Buy this item'}
      </Button>
      <p className="mt-3 text-center text-[11px] text-[#6b7280]">Paid in full at checkout. CineVerse delivers and pays the seller after delivery.</p>
    </div>
  )
}
