'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Loader2, LockKeyhole, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCart, cartTotal } from '@/lib/cart-store'
import { toast } from 'sonner'
import { STORE, formatMoney } from '@/lib/storefront'

export default function CheckoutPage() {
  const { items, clearCart } = useCart()
  const total = cartTotal(items)
  const shipping = total >= STORE.freeShippingThreshold ? 0 : 120
  const payableTotal = total + shipping
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })

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
        body: JSON.stringify({ customer: form, items }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')

      clearCart()
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950">
        <ArrowLeft className="h-4 w-4" />
        Continue shopping
      </Link>
      <div className="mb-8">
        <p className="text-sm font-semibold text-emerald-700">Secure checkout</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-950">Complete your order</h1>
        <p className="mt-2 text-sm text-stone-500">Customer details are saved with the order before PayMongo payment.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-stone-950">Shipping Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="Juan dela Cruz"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="09XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Input
                  id="address"
                  required
                  placeholder="Street, Barangay, City, Province"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>You will be redirected to PayMongo to pay via GCash, Maya, card, or other enabled methods.</p>
            </div>
            <div className="flex gap-3 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <p>{shipping === 0 ? 'Free shipping is unlocked for this order.' : `Add ${formatMoney(STORE.freeShippingThreshold - total)} more for free shipping.`}</p>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full bg-stone-950 text-white hover:bg-stone-800"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pay {formatMoney(payableTotal)}
              </>
            )}
          </Button>
        </form>

        <div className="lg:col-span-2">
          <div className="sticky top-28 space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-950">Order Summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-stone-100">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-stone-950">{item.name}</p>
                    <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-stone-950">
                    {formatMoney(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-stone-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold text-stone-950">
              <span>Total</span>
              <span>{formatMoney(payableTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
