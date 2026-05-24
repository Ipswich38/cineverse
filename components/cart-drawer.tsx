'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2, Truck } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCart, cartTotal } from '@/lib/cart-store'
import { DEMO_PRODUCTS, STORE, formatMoney, getCartRecommendations } from '@/lib/storefront'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, addItem } = useCart()
  const total = cartTotal(items)
  const remainingForFreeShipping = Math.max(STORE.freeShippingThreshold - total, 0)
  const progress = Math.min((total / STORE.freeShippingThreshold) * 100, 100)
  const recommendations = getCartRecommendations(items, DEMO_PRODUCTS, 2)

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-stone-100 px-5 py-4">
          <SheetTitle className="text-lg font-semibold">Your Cart ({items.length} items)</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-stone-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-stone-950">Your cart is empty</p>
              <p className="mt-1 text-sm">Add products to start a checkout-ready order.</p>
            </div>
            <Button variant="outline" onClick={closeCart}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-stone-100 px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-stone-950">
                  <Truck className="h-4 w-4 text-emerald-700" />
                  Free shipping
                </span>
                <span className="text-stone-500">
                  {remainingForFreeShipping === 0 ? 'Unlocked' : `${formatMoney(remainingForFreeShipping)} away`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-lg border border-stone-100 p-3">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-stone-100">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-stone-950">{item.name}</p>
                    <p className="text-sm text-stone-500">{formatMoney(item.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {recommendations.length > 0 && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Smart add-ons</p>
                      <p className="text-xs text-emerald-800">
                        {remainingForFreeShipping > 0
                          ? `Add one to get closer to free shipping.`
                          : 'Frequently bought with your cart.'}
                      </p>
                    </div>
                    <ShoppingCart className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="space-y-2">
                    {recommendations.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-md bg-white p-2">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-stone-100">
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-semibold text-stone-950">{product.name}</p>
                          <p className="text-xs text-stone-500">{formatMoney(product.price)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 bg-white text-xs"
                          onClick={() => addItem({
                            id: product.id,
                            name: product.name,
                            slug: product.slug,
                            price: product.price,
                            image_url: product.image_url,
                            category: product.category,
                            tags: product.tags ?? [],
                          })}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-stone-100 p-5">
              <div className="space-y-2 text-sm text-stone-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{remainingForFreeShipping === 0 ? 'Free' : 'Calculated at checkout'}</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-semibold text-stone-950">
                <span>Estimated total</span>
                <span>{formatMoney(total)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonVariants({ size: 'lg', className: 'h-11 w-full bg-stone-950 text-white hover:bg-stone-800' })}
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
