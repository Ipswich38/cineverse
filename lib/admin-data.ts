import type { Product } from '@/lib/supabase'
import { DEMO_PRODUCTS } from '@/lib/storefront'

export type FulfillmentStatus =
  | 'awaiting_payment'
  | 'to_pack'
  | 'packing'
  | 'ready_to_ship'
  | 'picked_up'
  | 'shipped'
  | 'delivered'
  | 'returned'

export interface AdminOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
}

export interface AdminOrder {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  total_amount: number
  shipping_method: 'standard' | 'express'
  payment_method: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  fulfillment_status: FulfillmentStatus
  courier_name?: string
  tracking_number?: string
  created_at: string
  paid_at?: string
  items: AdminOrderItem[]
}

export const FULFILLMENT_STATUSES: Array<{
  key: FulfillmentStatus
  label: string
  description: string
}> = [
  { key: 'awaiting_payment', label: 'Awaiting Payment', description: 'Order created but PayMongo has not confirmed payment.' },
  { key: 'to_pack', label: 'To Pack', description: 'Paid order is ready for picking and packing.' },
  { key: 'packing', label: 'Packing', description: 'Staff is preparing the items and parcel.' },
  { key: 'ready_to_ship', label: 'Ready to Ship', description: 'Parcel is packed and waiting for courier.' },
  { key: 'picked_up', label: 'Picked Up', description: 'Courier has collected the parcel.' },
  { key: 'shipped', label: 'Shipped', description: 'Shipment is in transit.' },
  { key: 'delivered', label: 'Delivered', description: 'Order completed after delivery.' },
  { key: 'returned', label: 'Returned', description: 'Order was returned or failed delivery.' },
]

export const DEMO_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-1042',
    customer_name: 'Alyssa Reyes',
    customer_email: 'alyssa@example.com',
    customer_phone: '09171234567',
    customer_address: 'Legazpi Village, Makati, Metro Manila, 1229',
    total_amount: 2930,
    shipping_method: 'express',
    payment_method: 'GCash via PayMongo',
    status: 'paid',
    fulfillment_status: 'to_pack',
    created_at: '2026-05-24T08:15:00.000Z',
    paid_at: '2026-05-24T08:18:00.000Z',
    items: [
      { product_id: 'demo-tee', product_name: 'Everyday Oxford Shirt', quantity: 1, unit_price: 1290 },
      { product_id: 'demo-tote', product_name: 'Structured Canvas Tote', quantity: 1, unit_price: 890 },
      { product_id: 'demo-socks', product_name: 'Commuter Rib Socks', quantity: 1, unit_price: 320 },
    ],
  },
  {
    id: 'ORD-1041',
    customer_name: 'Marco Santos',
    customer_email: 'marco@example.com',
    customer_phone: '09981234567',
    customer_address: 'Lahug, Cebu City, Cebu, 6000',
    total_amount: 4380,
    shipping_method: 'standard',
    payment_method: 'Card via PayMongo',
    status: 'paid',
    fulfillment_status: 'ready_to_ship',
    courier_name: 'J&T Express',
    tracking_number: 'JT928341882PH',
    created_at: '2026-05-23T14:42:00.000Z',
    paid_at: '2026-05-23T14:45:00.000Z',
    items: [
      { product_id: 'demo-lamp', product_name: 'Dawn Table Lamp', quantity: 1, unit_price: 2490 },
      { product_id: 'demo-duffle', product_name: 'Weekend Duffle Bag', quantity: 1, unit_price: 1890 },
    ],
  },
  {
    id: 'ORD-1040',
    customer_name: 'Nica Tan',
    customer_email: 'nica@example.com',
    customer_phone: '09061234567',
    customer_address: 'Poblacion, Davao City, Davao del Sur, 8000',
    total_amount: 1180,
    shipping_method: 'standard',
    payment_method: 'Maya via PayMongo',
    status: 'paid',
    fulfillment_status: 'shipped',
    courier_name: 'LBC',
    tracking_number: 'LBC55291083',
    created_at: '2026-05-22T10:20:00.000Z',
    paid_at: '2026-05-22T10:22:00.000Z',
    items: [
      { product_id: 'demo-bottle', product_name: 'Insulated Travel Bottle', quantity: 1, unit_price: 690 },
      { product_id: 'demo-cap', product_name: 'Everyday Cotton Cap', quantity: 1, unit_price: 490 },
    ],
  },
  {
    id: 'ORD-1039',
    customer_name: 'Carlo Mendoza',
    customer_email: 'carlo@example.com',
    customer_phone: '09221234567',
    customer_address: 'San Fernando, Pampanga, 2000',
    total_amount: 2440,
    shipping_method: 'standard',
    payment_method: 'PayMongo Checkout',
    status: 'pending',
    fulfillment_status: 'awaiting_payment',
    created_at: '2026-05-24T09:03:00.000Z',
    items: [
      { product_id: 'demo-lounge', product_name: 'Ribbed Lounge Set', quantity: 1, unit_price: 1590 },
      { product_id: 'demo-candle', product_name: 'Hinoki Soy Candle', quantity: 1, unit_price: 760 },
    ],
  },
]

export function getInventoryMovements(orders: AdminOrder[]) {
  return orders
    .filter((order) => order.status === 'paid')
    .flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}-${item.product_id}`,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: -item.quantity,
        reason: 'Paid order stock deduction',
        created_at: order.paid_at ?? order.created_at,
      }))
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

export function getLowStockProducts(products: Product[], threshold = 8) {
  return products.filter((product) => product.stock <= threshold).sort((a, b) => a.stock - b.stock)
}

export function getDemoProductsWithMovement() {
  const paidQuantities = new Map<string, number>()
  for (const order of DEMO_ORDERS) {
    if (order.status !== 'paid') continue
    for (const item of order.items) {
      paidQuantities.set(item.product_id, (paidQuantities.get(item.product_id) ?? 0) + item.quantity)
    }
  }

  return DEMO_PRODUCTS.map((product) => ({
    ...product,
    stock: Math.max(product.stock - (paidQuantities.get(product.id) ?? 0), 0),
  }))
}
