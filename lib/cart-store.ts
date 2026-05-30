'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Fixed reservation downpayment: renter pays 30% now, settles the balance with the owner on handover.
export const DOWNPAYMENT_PCT = 0.3

// Managed logistics: CineVerse picks up from each owner, delivers to the renter, then collects
// and returns it. Charged per distinct owner (each is a separate round-trip pickup/return).
export const LOGISTICS_FEE_PER_OWNER = 600
export type LogisticsMethod = 'self' | 'managed'

export interface CartItem {
  id: string
  name: string
  slug: string
  price: number // daily rate
  image_url: string
  category?: string
  tags?: string[]
  quantity: number // units
  days: number // rental duration
  // Smart add-on: hire an operator to run this gear
  operatorAvailable?: boolean
  operatorDayRate?: number
  withOperator?: boolean
  // Owner (first name only shown pre-payment; full contact shared after downpayment)
  ownerName?: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity' | 'days' | 'withOperator'> & { days?: number; withOperator?: boolean }) => void
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
        const existing = get().items.find((i) => i.id === item.id)
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
            isOpen: true,
          })
        } else {
          set({
            items: [
              ...get().items,
              {
                ...item,
                quantity: 1,
                days: item.days ?? 1,
                withOperator: item.withOperator ?? false,
              },
            ],
            isOpen: true,
          })
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

// --- Rental money math -------------------------------------------------------

export const itemRental = (item: CartItem) => item.price * item.quantity * item.days

export const itemOperatorFee = (item: CartItem) =>
  item.withOperator && item.operatorAvailable ? (item.operatorDayRate ?? 0) * item.days : 0

export const itemLineTotal = (item: CartItem) => itemRental(item) + itemOperatorFee(item)

export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + itemRental(item), 0)

export const cartOperatorTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + itemOperatorFee(item), 0)

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + itemLineTotal(item), 0)

export const cartDownpayment = (items: CartItem[]) =>
  Math.round(cartTotal(items) * DOWNPAYMENT_PCT)

export const cartBalance = (items: CartItem[]) =>
  cartTotal(items) - cartDownpayment(items)

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0)

// Distinct equipment owners in the cart (each is a separate pickup/return for managed logistics).
export const cartOwnerCount = (items: CartItem[]) =>
  new Set(items.map((item) => item.ownerName || item.id)).size

export const cartLogisticsFee = (items: CartItem[]) =>
  cartOwnerCount(items) * LOGISTICS_FEE_PER_OWNER
