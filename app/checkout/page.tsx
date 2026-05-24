'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Loader2, LockKeyhole, PackageCheck, Plus, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useCart, cartTotal } from '@/lib/cart-store'
import { toast } from 'sonner'
import {
  DELIVERY_OPTIONS,
  DEMO_PRODUCTS,
  ORDER_STATUS_STEPS,
  PAYMENT_METHODS,
  STORE,
  formatMoney,
  getCartRecommendations,
} from '@/lib/storefront'

export default function CheckoutPage() {
  const { items, addItem } = useCart()
  const total = cartTotal(items)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [billingSame, setBillingSame] = useState(true)
  const [deliveryId, setDeliveryId] = useState<(typeof DELIVERY_OPTIONS)[number]['id']>('standard')
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('paymongo_all')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    billingAddress: '',
  })

  const deliveryOption = DELIVERY_OPTIONS.find((option) => option.id === deliveryId) ?? DELIVERY_OPTIONS[0]
  const shipping = deliveryId === 'standard' && total >= STORE.freeShippingThreshold ? 0 : deliveryOption.fee
  const payableTotal = total + shipping
  const recommendations = useMemo(() => getCartRecommendations(items, DEMO_PRODUCTS, 3), [items])

  useEffect(() => {
    if (items.length === 0) router.push('/')
  }, [items, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const shippingAddress = [
      form.address,
      form.city,
      form.province,
      form.postalCode,
    ].filter(Boolean).join(', ')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            address: shippingAddress,
          },
          checkout: {
            billingAddress: billingSame ? shippingAddress : form.billingAddress,
            deliveryMethod: deliveryId,
            paymentMethod,
          },
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950">
        <ArrowLeft className="h-4 w-4" />
        Continue shopping
      </Link>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-700">Secure checkout</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-950">Complete your order</h1>
        <p className="mt-2 text-sm text-stone-500">Shipping, billing, payment preference, and fulfillment details are captured before PayMongo payment.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="space-y-5 lg:col-span-3">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">1. Contact and Shipping</h2>
              <Truck className="h-5 w-5 text-sky-700" />
            </div>
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
              <div className="sm:col-span-2">
                <Label htmlFor="address">Street / Barangay</Label>
                <Input id="address" required placeholder="Unit, street, barangay" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" required placeholder="Makati" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input id="province" required placeholder="Metro Manila" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" required placeholder="1200" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-stone-950">2. Delivery Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DELIVERY_OPTIONS.map((option) => {
                const fee = option.id === 'standard' && total >= STORE.freeShippingThreshold ? 0 : option.fee
                return (
                  <label key={option.id} className={`cursor-pointer rounded-lg border p-4 transition-colors ${deliveryId === option.id ? 'border-sky-500 bg-sky-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                    <input
                      type="radio"
                      name="delivery"
                      value={option.id}
                      checked={deliveryId === option.id}
                      onChange={() => setDeliveryId(option.id)}
                      className="sr-only"
                    />
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-stone-950">{option.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-stone-500">{option.description}</span>
                      </span>
                      <span className="text-sm font-semibold text-stone-950">{fee === 0 ? 'Free' : formatMoney(fee)}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-stone-950">3. Billing and Payment</h2>
            <label className="mb-4 flex items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={billingSame}
                onChange={(e) => setBillingSame(e.target.checked)}
                className="h-4 w-4 accent-sky-700"
              />
              Billing address is the same as shipping address.
            </label>
            {!billingSame && (
              <div className="mb-4">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Input id="billingAddress" required placeholder="Billing address for receipt records" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
              </div>
            )}
            <div className="grid gap-3">
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id} className={`cursor-pointer rounded-lg border p-4 transition-colors ${paymentMethod === method.id ? 'border-stone-950 bg-stone-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="sr-only"
                  />
                  <span className="flex gap-3">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                    <span>
                      <span className="block text-sm font-semibold text-stone-950">{method.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-stone-500">{method.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-950">
              <PackageCheck className="h-4 w-4" />
              After payment workflow
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {ORDER_STATUS_STEPS.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="rounded-md bg-white p-3">
                  <Icon className="mb-2 h-4 w-4 text-sky-700" />
                  <p className="text-xs font-semibold text-stone-950">{label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-stone-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" className="h-11 w-full bg-stone-950 text-white hover:bg-stone-800" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting to PayMongo...
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
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-stone-950">{item.name}</p>
                    <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-stone-950">{formatMoney(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            {recommendations.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-3 text-sm font-semibold text-stone-950">Add before checkout</p>
                  <div className="space-y-2">
                    {recommendations.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-lg border border-stone-100 p-2">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-stone-100">
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-semibold text-stone-950">{product.name}</p>
                          <p className="text-xs text-stone-500">{formatMoney(product.price)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => addItem({
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            price: product.price,
                            image_url: product.image_url,
                            category: product.category,
                            tags: product.tags ?? [],
                          })}
                          aria-label={`Add ${product.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-2 text-sm text-stone-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>{deliveryOption.label}</span>
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
