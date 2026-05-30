'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CalendarRange, Loader2, LockKeyhole, ShoppingBag, Truck, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  useCart,
  cartMode,
  cartSubtotal,
  cartOperatorTotal,
  cartTotal,
  cartDownpayment,
  cartBalance,
  cartLogisticsFee,
  cartSaleDelivery,
  cartOwnerCount,
  itemLineTotal,
} from '@/lib/cart-store'
import { toast } from 'sonner'
import { PAYMENT_METHODS, formatMoney } from '@/lib/storefront'

export default function CheckoutPage() {
  const { items } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('paymongo_all')
  const buy = cartMode(items) === 'buy'

  const subtotal = cartSubtotal(items)
  const operatorTotal = cartOperatorTotal(items)
  const total = cartTotal(items)
  const downpayment = cartDownpayment(items)
  const balance = cartBalance(items)
  const ownerCount = cartOwnerCount(items)
  const logisticsFee = cartLogisticsFee(items) // rental round-trip
  const saleDelivery = cartSaleDelivery(items) // purchase one-way
  const payNow = buy ? total + saleDelivery : downpayment + logisticsFee

  const [form, setForm] = useState({ name: '', email: '', phone: '', shootStartDate: '', notes: '', deliveryAddress: '' })

  useEffect(() => {
    if (items.length === 0) router.push('/')
  }, [items, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const checkout = buy
        ? { kind: 'purchase' as const, deliveryAddress: form.deliveryAddress, paymentMethod }
        : { kind: 'rental' as const, shootStartDate: form.shootStartDate, notes: form.notes, logisticsMethod: 'managed' as const, paymentMethod }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: { name: form.name, email: form.email, phone: form.phone }, checkout, items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/#gear" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" />
        Keep browsing
      </Link>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8843e]">{buy ? 'Secure purchase' : 'Secure reservation'}</p>
        <h1 className="mt-1 text-3xl font-semibold text-[#111827]">{buy ? 'Complete your purchase' : 'Reserve your gear'}</h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          {buy
            ? 'Pay in full now. CineVerse delivers your gear and pays the seller after delivery.'
            : 'Pay a 30% reservation now (plus delivery). The 70% balance is collected by CineVerse before handover — we pay the owner after a clean return.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3">
          {/* Contact */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#111827]">1. Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="Juan dela Cruz" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="juan@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" required placeholder="09XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Step 2 — buy: delivery address / rent: shoot details */}
          {buy ? (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111827]">2. Delivery address</h2>
                <Truck className="h-5 w-5 text-[#C5A059]" />
              </div>
              <Label htmlFor="deliveryAddress">Where should we deliver?</Label>
              <Input id="deliveryAddress" required placeholder="Unit, street, barangay, city, province" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
              <p className="mt-3 text-[11px] leading-5 text-[#6b7280]">CineVerse delivers from the seller to you. One-way delivery {formatMoney(saleDelivery)}{ownerCount > 1 ? ` (${ownerCount} sellers)` : ''}.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111827]">2. Shoot details</h2>
                <CalendarRange className="h-5 w-5 text-[#C5A059]" />
              </div>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="shootStartDate">Shoot start date</Label>
                  <Input id="shootStartDate" type="date" value={form.shootStartDate} onChange={(e) => setForm({ ...form, shootStartDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="notes">Delivery address &amp; notes</Label>
                  <Input id="notes" placeholder="Delivery address, production name, special requests" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Logistics (rental only — purchase delivery is built into the price) */}
          {!buy && (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#111827]">3. Pickup &amp; return</h2>
                <Truck className="h-5 w-5 text-[#C5A059]" />
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#FFCC00] bg-[#FFF7DB] p-4">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111827]">CineVerse handles delivery &amp; return</p>
                    <p className="text-sm font-semibold text-[#111827]">{formatMoney(logisticsFee)}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                    We pick up from {ownerCount > 1 ? `all ${ownerCount} owners` : 'the owner'}, deliver to you, then collect and return after your shoot.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#111827]">{buy ? '3' : '4'}. Payment method</h2>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id} className={`cursor-pointer rounded-xl border p-4 transition-colors ${paymentMethod === method.id ? 'border-[#FFCC00] bg-[#FFF7DB]' : 'border-black/[0.08] hover:border-black/20'}`}>
                  <input type="radio" name="paymentMethod" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="sr-only" />
                  <span className="flex gap-3">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                    <span>
                      <span className="block text-sm font-semibold text-[#111827]">{method.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#6b7280]">{method.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" className="h-12 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800]" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to PayMongo...</>
            ) : (
              <>{buy ? <ShoppingBag className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />} {buy ? 'Pay' : 'Pay now'} {formatMoney(payNow)}</>
            )}
          </Button>
        </form>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-black/[0.08] bg-white p-5">
            <h2 className="font-semibold text-[#111827]">{buy ? 'Order summary' : 'Booking summary'}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{item.name}</p>
                    <p className="text-xs text-[#6b7280]">{item.quantity} unit(s){buy ? '' : ` · ${item.days} day(s)`}</p>
                    {!buy && item.withOperator && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#a8843e]">
                        <UserCog className="h-3 w-3" /> with operator
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#111827]">{formatMoney(itemLineTotal(item))}</p>
                </div>
              ))}
            </div>

            <Separator />
            {buy ? (
              <div className="space-y-2 text-sm text-[#6b7280]">
                <div className="flex justify-between"><span>Items</span><span>{formatMoney(subtotal)}</span></div>
                <div className="flex justify-between"><span>Delivery (one-way) {ownerCount > 1 ? `(${ownerCount} sellers)` : ''}</span><span>{formatMoney(saleDelivery)}</span></div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-[#6b7280]">
                <div className="flex justify-between"><span>Gear rental</span><span>{formatMoney(subtotal)}</span></div>
                {operatorTotal > 0 && <div className="flex justify-between"><span>Operators</span><span>{formatMoney(operatorTotal)}</span></div>}
                <div className="flex justify-between font-semibold text-[#111827]"><span>Rental total</span><span>{formatMoney(total)}</span></div>
                <div className="flex justify-between"><span>30% gear downpayment</span><span>{formatMoney(downpayment)}</span></div>
                <div className="flex justify-between"><span>Managed delivery {ownerCount > 1 ? `(${ownerCount} owners)` : ''}</span><span>{formatMoney(logisticsFee)}</span></div>
                <div className="flex justify-between"><span>Balance (70%) — via CineVerse later</span><span>{formatMoney(balance)}</span></div>
              </div>
            )}
            <Separator />
            <div className="flex justify-between rounded-xl border-l-2 border-[#FFCC00] bg-[#FFF7DB] px-3 py-3 text-lg font-semibold text-[#111827]">
              <span>{buy ? 'Total' : 'Pay now'}</span>
              <span>{formatMoney(payNow)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
