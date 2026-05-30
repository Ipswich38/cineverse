'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Fixed reservation downpayment: renter pays 30% now, settles the balance with the owner on handover.
export const DOWNPAYMENT_PCT = 0.3

// Managed logistics: CineVerse picks up from each owner, delivers to the renter, then collects
// and returns it. Charged per distinct owner (each is a separate round-trip pickup/return).
export const LOGISTICS_FEE_PER_OWNER = 600
export type LogisticsMethod = 'self' | 'managed'

// One-way delivery for purchases (seller → buyer), per distinct seller.
export const SALE_DELIVERY_FEE_PER_SELLER = 300

// Platform commission retained from the owner/seller payout. CineVerse collects 100% from the
// customer and pays the owner net of this (rentals: 30% + 70%; purchases: full payment).
export const COMMISSION_PCT = 0.15

export type CartMode = 'rent' | 'buy'

export interface CartItem {
  id: string
  name: string
  slug: string
  price: number // daily rental rate
  image_url: string
  category?: string
  tags?: string[]
  quantity: number // units
  mode: CartMode
  days: number // rental duration (rent mode)
  salePrice?: number // purchase price (buy mode)
  // Smart add-on: hire an operator to run this gear (rent mode)
  operatorAvailable?: boolean
  operatorDayRate?: number
  withOperator?: boolean
  ownerName?: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity' | 'days' | 'withOperator' | 'mode'> & { mode?: CartMode; days?: number; withOperator?: boolean }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateDays: (id: string, days: number) => void
  toggleOperator: (id: string, value?: boolean) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const mode: CartMode = item.mode ?? 'rent'
        const newItem: CartItem = {
          ...item,
          mode,
          quantity: 1,
          days: item.days ?? 1,
          withOperator: item.withOperator ?? false,
        }
        const items = get().items
        // A cart is single-mode (rent OR buy). Switching modes starts a fresh cart.
        if (items.length && items[0].mode !== mode) {
          set({ items: [newItem], isOpen: true })
          return
        }
        const existing = items.find((i) => i.id === item.id)
        if (existing) {
          set({
            items: items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)),
            isOpen: true,
          })
        } else {
          set({ items: [...items, newItem], isOpen: true })
        }
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity < 1) {
          get().removeItem(id)
          return
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })
      },

      updateDays: (id, days) => {
        const next = Math.max(1, Math.round(days) || 1)
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, days: next } : i)),
        })
      },

      toggleOperator: (id, value) =>
        set({
          items: get().items.map((i) =>
            i.id === id && i.operatorAvailable
              ? { ...i, withOperator: value ?? !i.withOperator }
              : i
          ),
        }),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    { name: 'cineverse-cart' }
  )
)

// --- Mode -------------------------------------------------------------------

export const cartMode = (items: CartItem[]): CartMode => items[0]?.mode ?? 'rent'

// --- Money math (mode-aware) ------------------------------------------------

export const itemRental = (item: CartItem) => item.price * item.quantity * item.days

export const itemOperatorFee = (item: CartItem) =>
  item.withOperator && item.operatorAvailable ? (item.operatorDayRate ?? 0) * item.days : 0

export const itemPurchase = (item: CartItem) => (item.salePrice ?? 0) * item.quantity

export const itemLineTotal = (item: CartItem) =>
  item.mode === 'buy' ? itemPurchase(item) : itemRental(item) + itemOperatorFee(item)

// Goods subtotal (rental gear, or purchase price), excluding operator add-ons.
export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + (item.mode === 'buy' ? itemPurchase(item) : itemRental(item)), 0)

export const cartOperatorTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + itemOperatorFee(item), 0)

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + itemLineTotal(item), 0)

// Rental-only: 30% reservation now.
export const cartDownpayment = (items: CartItem[]) =>
  Math.round(cartTotal(items) * DOWNPAYMENT_PCT)

export const cartBalance = (items: CartItem[]) =>
  cartTotal(items) - cartDownpayment(items)

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0)

// Distinct owners/sellers in the cart (each is a separate pickup for logistics).
export const cartOwnerCount = (items: CartItem[]) =>
  new Set(items.map((item) => item.ownerName || item.id)).size

// Rental logistics: round-trip per owner.
export const cartLogisticsFee = (items: CartItem[]) =>
  cartOwnerCount(items) * LOGISTICS_FEE_PER_OWNER

// Purchase delivery: one-way per seller.
export const cartSaleDelivery = (items: CartItem[]) =>
  cartOwnerCount(items) * SALE_DELIVERY_FEE_PER_SELLER
