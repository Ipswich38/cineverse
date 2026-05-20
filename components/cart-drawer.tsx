'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCart, cartTotal } from '@/lib/cart-store'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCart()
  const total = cartTotal(items)

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Cart ({items.length} items)</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <p>Your cart is empty</p>
            <Button variant="outline" onClick={closeCart}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 ml-auto"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonVariants({ size: 'lg', className: 'w-full bg-black hover:bg-gray-800 text-white' })}
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
