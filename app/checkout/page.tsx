'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCart, cartTotal } from '@/lib/cart-store'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const { items, clearCart } = useCart()
  const total = cartTotal(items)
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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid md:grid-cols-5 gap-10">
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-5">
          <div>
            <h2 className="font-semibold text-lg mb-4">Shipping Information</h2>
            <div className="space-y-4">
              <div>
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
              <div>
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

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
            You will be redirected to PayMongo to complete your payment securely via GCash, Maya, or Credit/Debit Card.
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-black hover:bg-gray-800 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
            )}
          </Button>
        </form>

        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border p-6 space-y-4 sticky top-24">
            <h2 className="font-semibold">Order Summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    ₱{(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
