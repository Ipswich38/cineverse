'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Minus, Plus, ShoppingBag, Trash2, UserCog } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useCart,
  cartMode,
  cartSubtotal,
  cartOperatorTotal,
  cartTotal,
  cartDownpayment,
  cartBalance,
  cartSaleDelivery,
  itemLineTotal,
} from '@/lib/cart-store'
import { DEMO_PRODUCTS, formatMoney, getCartRecommendations } from '@/lib/storefront'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, updateDays, toggleOperator, addItem } = useCart()
  const mode = cartMode(items)
  const buy = mode === 'buy'

  const subtotal = cartSubtotal(items)
  const operatorTotal = cartOperatorTotal(items)
  const total = cartTotal(items)
  const downpayment = cartDownpayment(items)
  const balance = cartBalance(items)
  const saleDelivery = cartSaleDelivery(items)
  const buyTotal = total + saleDelivery
  const recommendations = buy ? [] : getCartRecommendations(items, DEMO_PRODUCTS, 2)

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-black/[0.06] px-5 py-4">
          <SheetTitle className="text-lg font-semibold">{buy ? 'Your purchase' : 'Your booking'} ({items.length})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-[#6b7280]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f4f6]">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-[#111827]">Your cart is empty</p>
              <p className="mt-1 text-sm">Add gear to get started.</p>
            </div>
            <Button variant="outline" onClick={closeCart}>Browse gear</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-black/[0.06] p-3">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{item.name}</p>
                      {item.ownerName && <p className="text-[11px] text-[#6b7280]">by {item.ownerName}</p>}
                      <p className="mt-0.5 text-[13px] text-[#6b7280]">
                        {buy ? formatMoney(item.salePrice ?? 0) : `${formatMoney(item.price)}/day`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 shrink-0 text-[#ff3b30]/70 hover:text-[#ff3b30]"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    {!buy && (
                      <MiniStepper
                        icon={<Calendar className="h-3 w-3 text-[#6b7280]" />}
                        label="days"
                        value={item.days}
                        onDec={() => updateDays(item.id, item.days - 1)}
                        onInc={() => updateDays(item.id, item.days + 1)}
                      />
                    )}
                    <MiniStepper
                      label="units"
                      value={item.quantity}
                      onDec={() => updateQuantity(item.id, item.quantity - 1)}
                      onInc={() => updateQuantity(item.id, item.quantity + 1)}
                    />
                    <span className="ml-auto text-sm font-semibold text-[#111827]">{formatMoney(itemLineTotal(item))}</span>
                  </div>

                  {!buy && item.operatorAvailable && (
                    <button
                      onClick={() => toggleOperator(item.id)}
                      className={`mt-2 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] transition-colors ${
                        item.withOperator ? 'border-[#C5A059] bg-[#f6efdf] text-[#a8843e]' : 'border-black/[0.08] text-[#6b7280] hover:border-black/20'
                      }`}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      <span className="flex-1 font-medium">
                        {item.withOperator ? 'Operator added' : 'Add operator'} · {formatMoney(item.operatorDayRate ?? 0)}/day
                      </span>
                      <span className={`flex h-4 w-4 items-center justify-center rounded border ${item.withOperator ? 'border-[#C5A059] bg-[#C5A059] text-[#111827]' : 'border-black/20'}`}>
                        {item.withOperator && <span className="text-[9px] leading-none">✓</span>}
                      </span>
                    </button>
                  )}
                </div>
              ))}

              {recommendations.length > 0 && (
                <div className="rounded-xl border border-[#C5A059]/15 bg-[#C5A059]/[0.04] p-3">
                  <p className="mb-2 text-sm font-semibold text-[#111827]">Smart add-ons for your shoot</p>
                  <div className="space-y-2">
                    {recommendations.map((product) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-lg bg-white p-2">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-[#f3f4f6]">
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-xs font-semibold text-[#111827]">{product.name}</p>
                          <p className="text-xs text-[#6b7280]">{formatMoney(product.price)}/day</p>
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
                            ownerName: product.owner_name ?? undefined,
                            operatorAvailable: Boolean(product.operator_available),
                            operatorDayRate: product.operator_day_rate ?? undefined,
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

            <div className="space-y-3 border-t border-black/[0.06] p-5">
              {buy ? (
                <>
                  <div className="space-y-1.5 text-sm text-[#6b7280]">
                    <div className="flex justify-between"><span>Items</span><span>{formatMoney(subtotal)}</span></div>
                    <div className="flex justify-between"><span>Delivery (one-way)</span><span>{formatMoney(saleDelivery)}</span></div>
                  </div>
                  <div className="flex justify-between rounded-xl border-l-2 border-[#C5A059] bg-[#f6efdf] px-3 py-2.5 text-[15px] font-semibold text-[#111827]">
                    <span>Total</span>
                    <span>{formatMoney(buyTotal)}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className={buttonVariants({ size: 'lg', className: 'h-12 w-full rounded-xl bg-[#C5A059] text-[#111827] hover:bg-[#a8843e]' })}
                  >
                    Checkout — pay {formatMoney(buyTotal)}
                  </Link>
                </>
              ) : (
                <>
                  <div className="space-y-1.5 text-sm text-[#6b7280]">
                    <div className="flex justify-between"><span>Gear rental</span><span>{formatMoney(subtotal)}</span></div>
                    {operatorTotal > 0 && <div className="flex justify-between"><span>Operators</span><span>{formatMoney(operatorTotal)}</span></div>}
                    <div className="flex justify-between font-semibold text-[#111827]"><span>Rental total</span><span>{formatMoney(total)}</span></div>
                    <div className="flex justify-between"><span>Balance (70%) — via CineVerse</span><span>{formatMoney(balance)}</span></div>
                  </div>
                  <div className="flex justify-between rounded-xl border-l-2 border-[#C5A059] bg-[#f6efdf] px-3 py-2.5 text-[15px] font-semibold text-[#111827]">
                    <span>Pay now · 30%</span>
                    <span>{formatMoney(downpayment)}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className={buttonVariants({ size: 'lg', className: 'h-12 w-full rounded-xl bg-[#C5A059] text-[#111827] hover:bg-[#a8843e]' })}
                  >
                    Reserve — pay {formatMoney(downpayment)}
                  </Link>
                  <p className="text-center text-[11px] text-[#6b7280]">+ CineVerse delivery calculated at checkout</p>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function MiniStepper({
  icon,
  label,
  value,
  onDec,
  onInc,
}: {
  icon?: React.ReactNode
  label: string
  value: number
  onDec: () => void
  onInc: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[#f3f4f6] px-1.5 py-1">
      <button onClick={onDec} className="flex h-6 w-6 items-center justify-center rounded text-[#111827] hover:bg-black/5" aria-label={`Decrease ${label}`}>
        <Minus className="h-3 w-3" />
      </button>
      <span className="flex min-w-[44px] items-center justify-center gap-1 text-[12px] font-semibold text-[#111827]">
        {icon}
        {value} {label}
      </span>
      <button onClick={onInc} className="flex h-6 w-6 items-center justify-center rounded text-[#111827] hover:bg-black/5" aria-label={`Increase ${label}`}>
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
