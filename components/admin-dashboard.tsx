'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Box, CheckCircle2, Eye, Lock, LogOut, PackageCheck, Search, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEMO_ORDERS,
  FULFILLMENT_STATUSES,
  type AdminOrder,
  type FulfillmentStatus,
  getDemoProductsWithMovement,
  getInventoryMovements,
  getLowStockProducts,
} from '@/lib/admin-data'
import { formatMoney } from '@/lib/storefront'

const ADMIN_PASSWORD = 'demo-admin'

const statusStyles: Record<FulfillmentStatus, string> = {
  awaiting_payment: 'bg-stone-100 text-stone-700',
  to_pack: 'bg-amber-100 text-amber-800',
  packing: 'bg-sky-100 text-sky-800',
  ready_to_ship: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  returned: 'bg-red-100 text-red-800',
}

function statusLabel(status: FulfillmentStatus) {
  return FULFILLMENT_STATUSES.find((item) => item.key === status)?.label ?? status
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<AdminOrder[]>(DEMO_ORDERS)
  const [selectedOrderId, setSelectedOrderId] = useState(DEMO_ORDERS[0]?.id)
  const [query, setQuery] = useState('')

  const products = useMemo(() => getDemoProductsWithMovement(), [])
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0]
  const lowStock = getLowStockProducts(products)
  const movements = getInventoryMovements(orders)
  const paidOrders = orders.filter((order) => order.status === 'paid')
  const activeOrders = orders.filter((order) => !['delivered', 'returned'].includes(order.fulfillment_status))
  const filteredProducts = products.filter((product) => {
    const text = `${product.name} ${product.category} ${product.tags?.join(' ')}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  function login(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
    }
  }

  function updateOrderStatus(orderId: string, fulfillmentStatus: FulfillmentStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              fulfillment_status: fulfillmentStatus,
              courier_name: ['picked_up', 'shipped', 'delivered'].includes(fulfillmentStatus) ? order.courier_name ?? 'Demo Courier' : order.courier_name,
              tracking_number: ['picked_up', 'shipped', 'delivered'].includes(fulfillmentStatus) ? order.tracking_number ?? 'DEMO-TRACK-1042' : order.tracking_number,
            }
          : order
      )
    )
  }

  if (!authenticated) {
    return (
      <main className="min-h-[calc(100vh-220px)] bg-stone-50 px-4 py-16">
        <form onSubmit={login} className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-950">Admin Login</h1>
          <p className="mt-2 text-sm text-stone-500">
            Prototype admin access for inventory, paid orders, and fulfillment movement.
          </p>
          <div className="mt-5">
            <Label htmlFor="password">Demo Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="demo-admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="mt-5 h-10 w-full bg-stone-950 text-white hover:bg-stone-800">
            Enter Dashboard
          </Button>
          <p className="mt-3 text-xs text-stone-400">For client demo only. Replace with Supabase Auth before launch.</p>
        </form>
      </main>
    )
  }

  return (
    <main className="bg-stone-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Operations Console</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-950">Admin Inventory & Fulfillment</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-500">
              Track paid orders, stock movement, low inventory, and courier progress from payment to delivery.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAuthenticated(false)} className="w-fit">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <BarChart3 className="mb-3 h-5 w-5 text-emerald-700" />
            <p className="text-2xl font-semibold text-stone-950">{orders.length}</p>
            <p className="text-sm text-stone-500">Total orders</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <PackageCheck className="mb-3 h-5 w-5 text-emerald-700" />
            <p className="text-2xl font-semibold text-stone-950">{activeOrders.length}</p>
            <p className="text-sm text-stone-500">Active fulfillment</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <Box className="mb-3 h-5 w-5 text-emerald-700" />
            <p className="text-2xl font-semibold text-stone-950">{lowStock.length}</p>
            <p className="text-sm text-stone-500">Low-stock SKUs</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-700" />
            <p className="text-2xl font-semibold text-stone-950">{formatMoney(paidOrders.reduce((sum, order) => sum + order.total_amount, 0))}</p>
            <p className="text-sm text-stone-500">Paid demo revenue</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-stone-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold text-stone-950">Order Pipeline</h2>
                  <p className="text-sm text-stone-500">Move orders through packing, courier pickup, shipping, and delivery.</p>
                </div>
                <Badge variant="outline">{activeOrders.length} active</Badge>
              </div>
              <div className="divide-y divide-stone-100">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`grid w-full gap-3 p-4 text-left transition-colors md:grid-cols-[130px_1fr_160px_140px] md:items-center ${selectedOrder?.id === order.id ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{order.id}</p>
                      <p className="text-xs text-stone-500">{new Date(order.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-950">{order.customer_name}</p>
                      <p className="line-clamp-1 text-xs text-stone-500">{order.customer_address}</p>
                    </div>
                    <Badge className={statusStyles[order.fulfillment_status]}>{statusLabel(order.fulfillment_status)}</Badge>
                    <p className="text-sm font-semibold text-stone-950">{formatMoney(order.total_amount)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold text-stone-950">Live Inventory</h2>
                  <p className="text-sm text-stone-500">Demo stock reflects paid-order deductions for presentation.</p>
                </div>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3">
                  <Search className="h-4 w-4 text-stone-400" />
                  <input
                    className="w-48 bg-transparent text-sm outline-none"
                    placeholder="Search SKU"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-stone-100 bg-stone-50 text-xs uppercase text-stone-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-4 py-3 font-medium text-stone-950">{product.name}</td>
                        <td className="px-4 py-3 text-stone-500">{product.category}</td>
                        <td className="px-4 py-3 text-stone-950">{formatMoney(product.price)}</td>
                        <td className="px-4 py-3 font-semibold text-stone-950">{product.stock}</td>
                        <td className="px-4 py-3">
                          <Badge className={product.stock <= 5 ? 'bg-red-100 text-red-700' : product.stock <= 8 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
                            {product.stock <= 5 ? 'Reorder now' : product.stock <= 8 ? 'Watch' : 'Healthy'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            {selectedOrder && (
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-stone-950">{selectedOrder.id}</h2>
                    <p className="text-sm text-stone-500">{selectedOrder.customer_name}</p>
                  </div>
                  <Badge className={selectedOrder.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}>
                    {selectedOrder.status}
                  </Badge>
                </div>

                <div className="mb-4 space-y-3 rounded-lg bg-stone-50 p-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-400">Delivery</p>
                    <p className="text-stone-700">{selectedOrder.shipping_method} · {selectedOrder.courier_name ?? 'Courier not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-400">Tracking</p>
                    <p className="text-stone-700">{selectedOrder.tracking_number ?? 'Pending pickup'}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-stone-950">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={`${selectedOrder.id}-${item.product_id}`} className="flex justify-between gap-3 rounded-md border border-stone-100 p-2 text-sm">
                        <span className="text-stone-700">{item.quantity}x {item.product_name}</span>
                        <span className="font-medium text-stone-950">{formatMoney(item.quantity * item.unit_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mb-2 text-sm font-semibold text-stone-950">Move fulfillment status</p>
                <div className="grid gap-2">
                  {FULFILLMENT_STATUSES.filter((status) => status.key !== 'awaiting_payment').map((status) => (
                    <Button
                      key={status.key}
                      variant={selectedOrder.fulfillment_status === status.key ? 'default' : 'outline'}
                      className={selectedOrder.fulfillment_status === status.key ? 'justify-start bg-stone-950 text-white hover:bg-stone-800' : 'justify-start'}
                      onClick={() => updateOrderStatus(selectedOrder.id, status.key)}
                      disabled={selectedOrder.status !== 'paid'}
                    >
                      <Eye className="h-4 w-4" />
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-700" />
                <h2 className="font-semibold text-stone-950">Inventory Movement</h2>
              </div>
              <div className="space-y-3">
                {movements.slice(0, 6).map((movement) => (
                  <div key={movement.id} className="rounded-md border border-stone-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{movement.product_name}</p>
                        <p className="text-xs text-stone-500">{movement.order_id} · {movement.reason}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700">{movement.quantity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
