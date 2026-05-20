'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  slug: string
  price: number
  image_url: string
  quantity: number
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
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
          set({ items: [...get().items, { ...item, quantity: 1 }], isOpen: true })
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

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    { name: 'store-cart' }
  )
)

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
