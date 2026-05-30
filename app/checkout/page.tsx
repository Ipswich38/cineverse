'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CalendarRange, Loader2, LockKeyhole, PackageCheck, Truck, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  useCart,
  cartSubtotal,
  cartOperatorTotal,
  cartTotal,
  cartDownpayment,
  cartBalance,
  cartLogisticsFee,
  cartOwnerCount,
  itemLineTotal,
  type LogisticsMethod,
} from '@/lib/cart-store'
import { toast } from 'sonner'
import { PAYMENT_METHODS, formatMoney } from '@/lib/storefront'

export default function CheckoutPage() {
  const { items } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('paymongo_all')
  const [logisticsMethod, setLogisticsMethod] = useState<LogisticsMethod>('self')

  const subtotal = cartSubtotal(items)
  const operatorTotal = cartOperatorTotal(items)
  const total = cartTotal(items)
  const downpayment = cartDownpayment(items) // 30% of gear + operator
  const balance = cartBalance(items)
  const ownerCount = cartOwnerCount(items)
  const managedFee = cartLogisticsFee(items)
  const logisticsFee = logisticsMethod === 'managed' ? managedFee : 0
  const payNow = downpayment + logisticsFee

  const [form, setForm] = useState({ name: '', email: '', phone: '', shootStartDate: '', notes: '' })

  useEffect(() => {
    if (items.length === 0) router.push('/')
  }, [items, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, email: form.email, phone: form.phone },
          checkout: { shootStartDate: form.shootStartDate, notes: form.notes, logisticsMethod, paymentMethod },
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const logisticsOptions: { id: LogisticsMethod; label: string; desc: string; price: string; icon: typeof Truck }[] = [
    {
      id: 'self',
      label: 'I’ll handle pickup & return',
      desc: `Coordinate pickup and return directly with the ${ownerCount > 1 ? `${ownerCount} owners` : 'owner'}. No extra cost.`,
      price: 'Free',
      icon: PackageCheck,
    },
    {
      id: 'managed',
      label: 'CineVerse managed delivery',
      desc: `We pick up from ${ownerCount > 1 ? `all ${ownerCount} owners` : 'the owner'}, deliver to you, then collect and return after your shoot.`,
      price: `+${formatMoney(managedFee)}`,
      icon: Truck,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/#gear" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" />
        Keep browsing
      </Link>
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8843e]">Secure reservation</p>
        <h1 className="mt-1 text-3xl font-semibold text-[#111827]">Reserve your gear</h1>
        <p className="mt-2 text-sm text-[#6b7280]">Pay a 30% downpayment now (plus delivery, if chosen). The balance is settled with the owner on handover.</p>
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
            <p className="mt-3 text-xs text-[#6b7280]">Owners use these to coordinate with you once your downpayment clears.</p>
          </div>

          {/* Shoot details */}
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
                <Label htmlFor="notes">Notes for the owner (optional)</Label>
                <Input id="notes" placeholder="Pickup/delivery address, production name, special requests" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111827]">3. Pickup &amp; return</h2>
              <Truck className="h-5 w-5 text-[#C5A059]" />
            </div>
            <div className="grid gap-3">
              {logisticsOptions.map((opt) => (
                <label key={opt.id} className={`cursor-pointer rounded-xl border p-4 transition-colors ${logisticsMethod === opt.id ? 'border-[#C5A059] bg-[#f6efdf]' : 'border-black/[0.08] hover:border-black/20'}`}>
                  <input
                    type="radio"
                    name="logisticsMethod"
                    value={opt.id}
                    checked={logisticsMethod === opt.id}
                    onChange={() => setLogisticsMethod(opt.id)}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-3">
                    <opt.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#111827]">{opt.label}</span>
                        <span className="text-sm font-semibold text-[#111827]">{opt.price}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#6b7280]">{opt.desc}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#6b7280]">Managed delivery is billed at {formatMoney(600)} round-trip per owner and collected upfront.</p>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#111827]">4. Payment method</h2>
            <div className="grid gap-3">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id} className={`cursor-pointer rounded-xl border p-4 transition-colors ${paymentMethod === method.id ? 'border-[#C5A059] bg-[#f6efdf]' : 'border-black/[0.08] hover:border-black/20'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="sr-only"
                  />
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

          <Button type="submit" size="lg" className="h-12 w-full bg-[#C5A059] text-[#111827] hover:bg-[#a8843e]" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to PayMongo...</>
            ) : (
              <><LockKeyhole className="h-4 w-4" /> Pay now {formatMoney(payNow)}</>
            )}
          </Button>
        </form>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-black/[0.08] bg-white p-5">
            <h2 className="font-semibold text-[#111827]">Booking summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{item.name}</p>
                    <p className="text-xs text-[#6b7280]">{item.quantity} unit(s) · {item.days} day(s)</p>
                    {item.withOperator && (
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
            <div className="space-y-2 text-sm text-[#6b7280]">
              <div className="flex justify-between"><span>Gear rental</span><span>{formatMoney(subtotal)}</span></div>
              {operatorTotal > 0 && <div className="flex justify-between"><span>Operators</span><span>{formatMoney(operatorTotal)}</span></div>}
              <div className="flex justify-between font-semibold text-[#111827]"><span>Rental total</span><span>{formatMoney(total)}</span></div>
              <div className="flex justify-between"><span>30% gear downpayment</span><span>{formatMoney(downpayment)}</span></div>
              <div className="flex justify-between">
                <span>Managed delivery {logisticsFee > 0 && ownerCount > 1 ? `(${ownerCount} owners)` : ''}</span>
                <span>{logisticsFee > 0 ? formatMoney(logisticsFee) : '—'}</span>
              </div>
              <div className="flex justify-between"><span>Balance due to owner</span><span>{formatMoney(balance)}</span></div>
            </div>
            <Separator />
            <div className="flex justify-between rounded-xl border-l-2 border-[#C5A059] bg-[#f6efdf] px-3 py-3 text-lg font-semibold text-[#111827]">
              <span>Pay now</span>
              <span>{formatMoney(payNow)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
