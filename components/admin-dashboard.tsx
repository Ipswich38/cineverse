'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  Eye,
  Lock,
  LogOut,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DEMO_ORDERS,
  FULFILLMENT_STATUSES,
  type AdminOrder,
  type FulfillmentStatus,
  getDemoProductsWithMovement,
  getInventoryMovements,
  getLowStockProducts,
} from '@/lib/admin-data'
import type { Product } from '@/lib/supabase'
import { formatMoney } from '@/lib/storefront'

type Tab = 'orders' | 'products' | 'reorder'

type Modal =
  | { type: 'add' }
  | { type: 'edit'; product: Product }
  | { type: 'delete'; product: Product }
  | { type: 'adjust'; product: Product }

interface ProductForm {
  name: string
  slug: string
  description: string
  price: string
  compare_at_price: string
  image_url: string
  stock: string
  reorder_threshold: string
  category: string
  tags: string
  badge: string
  is_active: boolean
}

interface AdjustForm {
  delta: string
  reason: string
  note: string
}

const ADJUST_REASONS = [
  { value: 'manual_restock', label: 'Restock / new inventory' },
  { value: 'manual_correction', label: 'Stock correction' },
  { value: 'damaged', label: 'Damaged / write-off' },
  { value: 'lost', label: 'Lost / shrinkage' },
  { value: 'returned', label: 'Customer return' },
  { value: 'initial_stock', label: 'Initial stock entry' },
]

const EMPTY_FORM: ProductForm = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compare_at_price: '',
  image_url: '',
  stock: '0',
  reorder_threshold: '5',
  category: '',
  tags: '',
  badge: '',
  is_active: true,
}

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
  return FULFILLMENT_STATUSES.find((s) => s.key === status)?.label ?? status
}

function shortId(id: string) {
  if (id.length === 36 && id.includes('-')) return 'ORD-' + id.slice(0, 8).toUpperCase()
  return id
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function stockSignal(stock: number, threshold: number) {
  if (stock === 0) return { label: 'Out of stock', cls: 'bg-red-200 text-red-900' }
  if (stock <= Math.ceil(threshold * 0.5)) return { label: 'Reorder now', cls: 'bg-red-100 text-red-700' }
  if (stock <= threshold) return { label: 'Watch', cls: 'bg-amber-100 text-amber-800' }
  return { label: 'Healthy', cls: 'bg-sky-100 text-sky-800' }
}

function productToForm(p: Product): ProductForm {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    price: String(p.price),
    compare_at_price: p.compare_at_price ? String(p.compare_at_price) : '',
    image_url: p.image_url ?? '',
    stock: String(p.stock),
    reorder_threshold: String(p.reorder_threshold ?? 5),
    category: p.category ?? '',
    tags: p.tags?.join(', ') ?? '',
    badge: p.badge ?? '',
    is_active: p.is_active,
  }
}

// ─── Product Form Sheet ────────────────────────────────────────────────────

function ProductFormSheet({
  modal,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}: {
  modal: Modal | null
  form: ProductForm
  saving: boolean
  onChange: (patch: Partial<ProductForm>) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const isOpen = modal?.type === 'add' || modal?.type === 'edit'
  const title = modal?.type === 'add' ? 'Add Product' : 'Edit Product'

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-4 pb-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-name">Name *</Label>
              <Input
                id="pf-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  onChange({ name, slug: slugify(name) })
                }}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-slug">Slug *</Label>
              <Input
                id="pf-slug"
                value={form.slug}
                onChange={(e) => onChange({ slug: e.target.value })}
                placeholder="product-slug"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-desc">Description</Label>
            <textarea
              id="pf-desc"
              className="min-h-[80px] w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Short product description"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-price">Price (₱) *</Label>
              <Input id="pf-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => onChange({ price: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-compare">Compare-at price (₱)</Label>
              <Input id="pf-compare" type="number" min="0" step="0.01" value={form.compare_at_price} onChange={(e) => onChange({ compare_at_price: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-img">Image URL</Label>
            <Input id="pf-img" value={form.image_url} onChange={(e) => onChange({ image_url: e.target.value })} placeholder="https://..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pf-stock">Stock *</Label>
              <Input id="pf-stock" type="number" min="0" value={form.stock} onChange={(e) => onChange({ stock: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-threshold">Reorder at</Label>
              <Input id="pf-threshold" type="number" min="0" value={form.reorder_threshold} onChange={(e) => onChange({ reorder_threshold: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-category">Category</Label>
              <Input id="pf-category" value={form.category} onChange={(e) => onChange({ category: e.target.value })} placeholder="Drones" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-tags">Tags (comma-separated)</Label>
              <Input id="pf-tags" value={form.tags} onChange={(e) => onChange({ tags: e.target.value })} placeholder="drone, 4k, beginner" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-badge">Badge</Label>
              <Input id="pf-badge" value={form.badge} onChange={(e) => onChange({ badge: e.target.value })} placeholder="New, Best seller…" />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-sky-600"
              checked={form.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
            />
            Active (visible on storefront)
          </label>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving} className="bg-stone-950 text-white hover:bg-stone-800">
            {saving ? 'Saving…' : 'Save Product'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Stock Adjustment Sheet ────────────────────────────────────────────────

function AdjustSheet({
  product,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}: {
  product: Product | null
  form: AdjustForm
  saving: boolean
  onChange: (patch: Partial<AdjustForm>) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const delta = parseInt(form.delta, 10) || 0
  const preview = product ? Math.max(product.stock + delta, 0) : 0

  return (
    <Sheet open={!!product} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Adjust Stock</SheetTitle>
        </SheetHeader>

        {product && (
          <div className="space-y-4 px-4">
            <div className="rounded-lg bg-stone-50 p-3 text-sm">
              <p className="font-semibold text-stone-950">{product.name}</p>
              <p className="text-stone-500">Current stock: <span className="font-semibold text-stone-950">{product.stock}</span></p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-delta">Quantity change</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onChange({ delta: String(delta - 1) })}
                  className="h-9 w-9"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="adj-delta"
                  type="number"
                  className="text-center"
                  value={form.delta}
                  onChange={(e) => onChange({ delta: e.target.value })}
                  placeholder="0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onChange({ delta: String(delta + 1) })}
                  className="h-9 w-9"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-stone-500">
                New stock will be: <span className={`font-semibold ${preview === 0 ? 'text-red-600' : 'text-stone-950'}`}>{preview}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">Reason *</Label>
              <select
                id="adj-reason"
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                value={form.reason}
                onChange={(e) => onChange({ reason: e.target.value })}
              >
                <option value="">Select a reason…</option>
                {ADJUST_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-note">Note (optional)</Label>
              <Input id="adj-note" value={form.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="e.g. Received PO #421" />
            </div>
          </div>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving || !form.reason || !form.delta} className="bg-stone-950 text-white hover:bg-stone-800">
            {saving ? 'Saving…' : 'Apply Adjustment'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Delete Confirm ────────────────────────────────────────────────────────

function DeleteConfirm({ product, saving, onConfirm, onClose }: { product: Product | null; saving: boolean; onConfirm: () => void; onClose: () => void }) {
  if (!product) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
          <Trash2 className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="font-semibold text-stone-950">Deactivate product?</h3>
        <p className="mt-1 text-sm text-stone-500">
          <span className="font-medium text-stone-800">{product.name}</span> will be hidden from the storefront. Stock data is preserved.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={onConfirm} disabled={saving}>
            {saving ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Products Table ────────────────────────────────────────────────────────

function ProductsTab({
  products,
  loading,
  query,
  onQuery,
  onAdd,
  onEdit,
  onAdjust,
  onDelete,
}: {
  products: Product[]
  loading: boolean
  query: string
  onQuery: (q: string) => void
  onAdd: () => void
  onEdit: (p: Product) => void
  onAdjust: (p: Product) => void
  onDelete: (p: Product) => void
}) {
  const filtered = products.filter((p) => {
    const text = `${p.name} ${p.category} ${p.tags?.join(' ')}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-stone-950">Products</h2>
          <p className="text-sm text-stone-500">{products.length} SKUs · manage pricing, stock, and visibility.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3">
            <Search className="h-4 w-4 text-stone-400" />
            <input className="w-40 bg-transparent text-sm outline-none" placeholder="Search SKU" value={query} onChange={(e) => onQuery(e.target.value)} />
          </div>
          <Button onClick={onAdd} className="h-10 bg-stone-950 text-white hover:bg-stone-800">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-stone-400">Loading products…</div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Reorder at</th>
                <th className="px-4 py-3 font-semibold">Signal</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => {
                const threshold = p.reorder_threshold ?? 5
                const signal = stockSignal(p.stock, threshold)
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-950">{p.name}</p>
                      {p.badge && <span className="text-xs text-stone-400">{p.badge}</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{p.category}</td>
                    <td className="px-4 py-3 text-stone-950">{formatMoney(p.price)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-950">{p.stock}</td>
                    <td className="px-4 py-3 text-stone-500">{threshold}</td>
                    <td className="px-4 py-3">
                      <Badge className={signal.cls}>{signal.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onEdit(p)} title="Edit" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => onAdjust(p)} title="Adjust stock" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-sky-700">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(p)} title="Deactivate" className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-stone-400">No products match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Reorder Queue Tab ─────────────────────────────────────────────────────

function ReorderTab({ products }: { products: Product[] }) {
  const reorderList = products
    .filter((p) => p.stock <= (p.reorder_threshold ?? 5))
    .sort((a, b) => a.stock - b.stock)

  return (
    <div className="rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-100 p-4">
        <h2 className="font-semibold text-stone-950">Reorder Queue</h2>
        <p className="text-sm text-stone-500">{reorderList.length} SKU{reorderList.length !== 1 ? 's' : ''} at or below reorder threshold.</p>
      </div>
      {reorderList.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-stone-400">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          All products are sufficiently stocked.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Reorder at</th>
                <th className="px-4 py-3 font-semibold">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {reorderList.map((p) => {
                const threshold = p.reorder_threshold ?? 5
                const signal = stockSignal(p.stock, threshold)
                return (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-950">{p.name}</td>
                    <td className="px-4 py-3 text-stone-500">{p.category}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-stone-950'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{threshold}</td>
                    <td className="px-4 py-3">
                      <Badge className={signal.cls}>{signal.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('orders')

  const [orders, setOrders] = useState<AdminOrder[]>(DEMO_ORDERS)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  const [selectedOrderId, setSelectedOrderId] = useState<string>(DEMO_ORDERS[0]?.id)
  const [productQuery, setProductQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')

  const [modal, setModal] = useState<Modal | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_FORM)
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ delta: '', reason: '', note: '' })
  const [saving, setSaving] = useState(false)

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${password}` }), [password])

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/admin/orders', { headers: authHeader() })
      if (res.status === 503) { setIsDemo(true); setOrders(DEMO_ORDERS); return }
      if (!res.ok) return
      const data = await res.json()
      const mapped: AdminOrder[] = data.map((o: Record<string, unknown>) => ({
        ...o,
        items: (o.order_items as AdminOrder['items']) ?? [],
      }))
      setOrders(mapped)
      setIsDemo(false)
    } catch {
      setOrders(DEMO_ORDERS)
      setIsDemo(true)
    } finally {
      setLoadingOrders(false)
    }
  }, [authHeader])

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/admin/products', { headers: authHeader() })
      if (res.status === 503) {
        setProducts(getDemoProductsWithMovement())
        setIsDemo(true)
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setProducts(data)
    } catch {
      setProducts(getDemoProductsWithMovement())
    } finally {
      setLoadingProducts(false)
    }
  }, [authHeader])

  useEffect(() => {
    if (authenticated) {
      fetchOrders()
      fetchProducts()
    }
  }, [authenticated, fetchOrders, fetchProducts])

  // ── Login ──────────────────────────────────────────────────────────────

  function login(e: React.FormEvent) {
    e.preventDefault()
    if (password) setAuthenticated(true)
  }

  // ── Order fulfillment ──────────────────────────────────────────────────

  async function updateOrderStatus(orderId: string, fulfillmentStatus: FulfillmentStatus) {
    setOrders((cur) =>
      cur.map((o) =>
        o.id === orderId
          ? { ...o, fulfillment_status: fulfillmentStatus,
              courier_name: ['picked_up', 'shipped', 'delivered'].includes(fulfillmentStatus) ? o.courier_name ?? 'Courier' : o.courier_name,
              tracking_number: ['picked_up', 'shipped', 'delivered'].includes(fulfillmentStatus) ? o.tracking_number ?? 'TBD' : o.tracking_number,
            }
          : o
      )
    )

    if (isDemo) return
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment_status: fulfillmentStatus }),
      })
    } catch {
      // optimistic update already applied; silent fail
    }
  }

  // ── Product CRUD ───────────────────────────────────────────────────────

  function openAdd() {
    setProductForm(EMPTY_FORM)
    setModal({ type: 'add' })
  }

  function openEdit(p: Product) {
    setProductForm(productToForm(p))
    setModal({ type: 'edit', product: p })
  }

  function openAdjust(p: Product) {
    setAdjustForm({ delta: '', reason: '', note: '' })
    setModal({ type: 'adjust', product: p })
  }

  function openDelete(p: Product) {
    setModal({ type: 'delete', product: p })
  }

  async function saveProduct() {
    if (!productForm.name || !productForm.slug || !productForm.price || !productForm.stock) return
    setSaving(true)

    const body = {
      name: productForm.name,
      slug: productForm.slug,
      description: productForm.description,
      price: productForm.price,
      compare_at_price: productForm.compare_at_price || null,
      image_url: productForm.image_url,
      stock: productForm.stock,
      reorder_threshold: productForm.reorder_threshold || '5',
      category: productForm.category,
      tags: productForm.tags,
      badge: productForm.badge || null,
      is_active: productForm.is_active,
    }

    try {
      if (isDemo) {
        // Demo mode: apply changes locally only
        if (modal?.type === 'add') {
          const fakeProduct: Product = {
            id: `demo-${Date.now()}`,
            name: productForm.name,
            slug: productForm.slug,
            description: productForm.description,
            price: Number(productForm.price),
            compare_at_price: productForm.compare_at_price ? Number(productForm.compare_at_price) : null,
            image_url: productForm.image_url,
            stock: Number(productForm.stock),
            reorder_threshold: Number(productForm.reorder_threshold) || 5,
            category: productForm.category,
            tags: productForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
            badge: productForm.badge || null,
            is_active: productForm.is_active,
            created_at: new Date().toISOString(),
          }
          setProducts((cur) => [fakeProduct, ...cur])
        } else if (modal?.type === 'edit') {
          setProducts((cur) => cur.map((p) => p.id === modal.product.id ? {
            ...p,
            name: productForm.name,
            slug: productForm.slug,
            description: productForm.description,
            price: Number(productForm.price),
            compare_at_price: productForm.compare_at_price ? Number(productForm.compare_at_price) : null,
            image_url: productForm.image_url,
            stock: Number(productForm.stock),
            reorder_threshold: Number(productForm.reorder_threshold) || 5,
            category: productForm.category,
            tags: productForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
            badge: productForm.badge || null,
            is_active: productForm.is_active,
          } : p))
        }
        setModal(null)
        return
      }

      const url = modal?.type === 'edit' ? `/api/admin/products/${modal.product.id}` : '/api/admin/products'
      const method = modal?.type === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchProducts()
        setModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct() {
    if (modal?.type !== 'delete') return
    setSaving(true)
    try {
      if (isDemo) {
        setProducts((cur) => cur.map((p) => p.id === modal.product.id ? { ...p, is_active: false } : p))
        setModal(null)
        return
      }
      const res = await fetch(`/api/admin/products/${modal.product.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      if (res.ok) {
        await fetchProducts()
        setModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function adjustStock() {
    if (modal?.type !== 'adjust' || !adjustForm.reason || !adjustForm.delta) return
    setSaving(true)
    try {
      if (isDemo) {
        const delta = parseInt(adjustForm.delta, 10) || 0
        setProducts((cur) => cur.map((p) => p.id === modal.product.id ? { ...p, stock: Math.max(p.stock + delta, 0) } : p))
        setModal(null)
        return
      }
      const res = await fetch(`/api/admin/products/${modal.product.id}/adjust`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity_delta: parseInt(adjustForm.delta, 10), reason: adjustForm.reason, admin_note: adjustForm.note }),
      })
      if (res.ok) {
        const { stock } = await res.json()
        setProducts((cur) => cur.map((p) => p.id === modal.product.id ? { ...p, stock } : p))
        setModal(null)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────

  const demoProducts = isDemo ? getDemoProductsWithMovement() : []
  const displayProducts = products.length > 0 ? products : demoProducts
  const lowStock = getLowStockProducts(displayProducts)
  const movements = getInventoryMovements(orders)
  const paidOrders = orders.filter((o) => o.status === 'paid')
  const activeOrders = orders.filter((o) => !['delivered', 'returned'].includes(o.fulfillment_status))
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? orders[0]
  const filteredOrders = orders.filter((o) => {
    const text = `${o.id} ${o.customer_name} ${o.customer_address}`.toLowerCase()
    return text.includes(orderQuery.toLowerCase())
  })

  // ── Login screen ───────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <main className="min-h-[calc(100vh-220px)] bg-stone-50 px-4 py-16">
        <form onSubmit={login} className="mx-auto max-w-sm rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-stone-950">Admin Login</h1>
          <p className="mt-2 text-sm text-stone-500">Inventory, pricing, and fulfillment management.</p>
          <div className="mt-5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="mt-5 h-10 w-full bg-stone-950 text-white hover:bg-stone-800">
            Enter Dashboard
          </Button>
        </form>
      </main>
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────

  return (
    <main className="bg-stone-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">Operations Console</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-950">Admin Dashboard</h1>
            {isDemo && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Demo mode — Supabase not configured. Changes are local only.
              </p>
            )}
          </div>
          <Button variant="outline" onClick={() => setAuthenticated(false)} className="w-fit">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <BarChart3 className="mb-3 h-5 w-5 text-sky-700" />
            <p className="text-2xl font-semibold text-stone-950">{orders.length}</p>
            <p className="text-sm text-stone-500">Total orders</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <PackageCheck className="mb-3 h-5 w-5 text-sky-700" />
            <p className="text-2xl font-semibold text-stone-950">{activeOrders.length}</p>
            <p className="text-sm text-stone-500">Active fulfillment</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <Box className="mb-3 h-5 w-5 text-amber-600" />
            <p className="text-2xl font-semibold text-stone-950">{lowStock.length}</p>
            <p className="text-sm text-stone-500">Low-stock SKUs</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="text-2xl font-semibold text-stone-950">{formatMoney(paidOrders.reduce((sum, o) => sum + o.total_amount, 0))}</p>
            <p className="text-sm text-stone-500">Paid revenue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-stone-200 bg-white p-1 w-fit">
          {([
            { key: 'orders' as Tab, label: 'Orders', icon: ShoppingBag, count: undefined as number | undefined },
            { key: 'products' as Tab, label: 'Products', icon: Box, count: undefined as number | undefined },
            { key: 'reorder' as Tab, label: 'Reorder Queue', icon: AlertTriangle, count: lowStock.length > 0 ? lowStock.length : undefined },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-stone-950 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count != null && count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeTab === key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'orders' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="space-y-6">
              <div className="rounded-lg border border-stone-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-stone-950">Order Pipeline</h2>
                    <p className="text-sm text-stone-500">Move orders through packing, courier pickup, shipping, and delivery.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3">
                      <Search className="h-4 w-4 text-stone-400" />
                      <input className="w-36 bg-transparent text-sm outline-none" placeholder="Search orders" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} />
                    </div>
                    <Badge variant="outline">{activeOrders.length} active</Badge>
                  </div>
                </div>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-10 text-sm text-stone-400">Loading orders…</div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`grid w-full gap-3 p-4 text-left transition-colors md:grid-cols-[130px_1fr_160px_140px] md:items-center ${selectedOrder?.id === order.id ? 'bg-sky-50' : 'hover:bg-stone-50'}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-stone-950">{shortId(order.id)}</p>
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
                    {filteredOrders.length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-stone-400">No orders match your search.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-stone-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-stone-950">Live Inventory</h2>
                    <p className="text-sm text-stone-500">Stock levels reflecting paid-order deductions.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
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
                      {displayProducts.map((p) => {
                        const threshold = p.reorder_threshold ?? 5
                        const signal = stockSignal(p.stock, threshold)
                        return (
                          <tr key={p.id}>
                            <td className="px-4 py-3 font-medium text-stone-950">{p.name}</td>
                            <td className="px-4 py-3 text-stone-500">{p.category}</td>
                            <td className="px-4 py-3 text-stone-950">{formatMoney(p.price)}</td>
                            <td className="px-4 py-3 font-semibold text-stone-950">{p.stock}</td>
                            <td className="px-4 py-3">
                              <Badge className={signal.cls}>{signal.label}</Badge>
                            </td>
                          </tr>
                        )
                      })}
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
                      <h2 className="font-semibold text-stone-950">{shortId(selectedOrder.id)}</h2>
                      <p className="text-sm text-stone-500">{selectedOrder.customer_name}</p>
                    </div>
                    <Badge className={selectedOrder.status === 'paid' ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-700'}>
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
                          <span className="text-stone-700">{item.quantity}× {item.product_name}</span>
                          <span className="font-medium text-stone-950">{formatMoney(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mb-2 text-sm font-semibold text-stone-950">Move fulfillment status</p>
                  <div className="grid gap-2">
                    {FULFILLMENT_STATUSES.filter((s) => s.key !== 'awaiting_payment').map((s) => (
                      <Button
                        key={s.key}
                        variant={selectedOrder.fulfillment_status === s.key ? 'default' : 'outline'}
                        className={selectedOrder.fulfillment_status === s.key ? 'justify-start bg-stone-950 text-white hover:bg-stone-800' : 'justify-start'}
                        onClick={() => updateOrderStatus(selectedOrder.id, s.key)}
                        disabled={selectedOrder.status !== 'paid'}
                      >
                        <Eye className="h-4 w-4" />
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-sky-700" />
                  <h2 className="font-semibold text-stone-950">Inventory Movement</h2>
                </div>
                <div className="space-y-3">
                  {movements.slice(0, 6).map((m) => (
                    <div key={m.id} className="rounded-md border border-stone-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-950">{m.product_name}</p>
                          <p className="text-xs text-stone-500">{shortId(m.order_id)} · {m.reason}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700">{m.quantity}</Badge>
                      </div>
                    </div>
                  ))}
                  {movements.length === 0 && <p className="text-sm text-stone-400">No movements yet.</p>}
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'products' && (
          <ProductsTab
            products={displayProducts}
            loading={loadingProducts}
            query={productQuery}
            onQuery={setProductQuery}
            onAdd={openAdd}
            onEdit={openEdit}
            onAdjust={openAdjust}
            onDelete={openDelete}
          />
        )}

        {activeTab === 'reorder' && <ReorderTab products={displayProducts} />}
      </div>

      {/* Sheets + modals */}
      <ProductFormSheet
        modal={modal?.type === 'add' || modal?.type === 'edit' ? modal : null}
        form={productForm}
        saving={saving}
        onChange={(patch) => setProductForm((f) => ({ ...f, ...patch }))}
        onSubmit={saveProduct}
        onClose={() => setModal(null)}
      />

      <AdjustSheet
        product={modal?.type === 'adjust' ? modal.product : null}
        form={adjustForm}
        saving={saving}
        onChange={(patch) => setAdjustForm((f) => ({ ...f, ...patch }))}
        onSubmit={adjustStock}
        onClose={() => setModal(null)}
      />

      {modal?.type === 'delete' && (
        <DeleteConfirm
          product={modal.product}
          saving={saving}
          onConfirm={deleteProduct}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  )
}
