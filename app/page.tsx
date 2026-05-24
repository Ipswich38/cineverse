import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import ProductCard from '@/components/product-card'
import { hasSupabaseConfig, supabase, type Product } from '@/lib/supabase'
import {
  DEMO_PRODUCTS,
  FEATURED_CATEGORIES,
  STORE,
  TRUST_POINTS,
  formatMoney,
  getCategoryCount,
} from '@/lib/storefront'

export const dynamic = 'force-dynamic'

async function getProducts() {
  if (!hasSupabaseConfig()) {
    return DEMO_PRODUCTS
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error || !data?.length) {
    return DEMO_PRODUCTS
  }

  return data as Product[]
}

export default async function HomePage() {
  const products = await getProducts()
  const featured = products[0]

  return (
    <>
      <section className="relative min-h-[680px] overflow-hidden bg-stone-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1800&q=85')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.96)_0%,rgba(12,74,110,.76)_46%,rgba(14,165,233,.20)_100%)]" />
        <div className="relative mx-auto grid min-h-[680px] max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-stone-100 backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              Waevpoint aerial systems store
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-normal text-white sm:text-5xl md:text-6xl">
              Drone gear for creators, pilots, and field teams.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-stone-200 sm:text-lg">
              {STORE.name} brings drones, batteries, propellers, filters, and field kits into one direct checkout experience for Philippine pilots and aerial teams.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100"
              >
                Shop Drone Gear
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#categories"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                View Categories
              </Link>
            </div>
          </div>

          {featured && (
            <Link href={`/products/${featured.slug}`} className="hidden rounded-lg border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-md lg:block">
              <div className="overflow-hidden rounded-md bg-white text-stone-950">
                <div
                  className="h-80 bg-cover bg-center"
                  style={{ backgroundImage: `url('${featured.image_url}')` }}
                />
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Featured Product</p>
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">{featured.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-stone-500">{featured.description}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatMoney(featured.price)}</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 md:grid-cols-4">
          {TRUST_POINTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-950">{label}</p>
                <p className="text-xs text-stone-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-sky-700">Shop by category</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">Built around real flight workflows</h2>
            </div>
            <div className="hidden items-center gap-2 text-sm text-stone-500 sm:flex">
              <CheckCircle2 className="h-4 w-4 text-sky-600" />
              Stock-aware catalog
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_CATEGORIES.map((category) => (
              <Link
                key={category}
                href="#products"
                className="group rounded-lg border border-stone-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
              >
                <div className="mb-8 flex items-center justify-between">
                  <PackageCheck className="h-5 w-5 text-sky-700" />
                  <ArrowRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-1 group-hover:text-stone-950" />
                </div>
                <h3 className="font-semibold text-stone-950">{category}</h3>
                <p className="mt-1 text-sm text-stone-500">{getCategoryCount(products, category)} curated items</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-700">Flight-ready catalog</p>
              <h2 className="mt-1 text-3xl font-semibold text-stone-950">All Drone Products</h2>
              <p className="mt-2 text-sm text-stone-500">{products.length} products available for the Waevpoint catalog</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500">
                <Search className="h-4 w-4" />
                Search-ready drone catalog
              </div>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-500">
                <SlidersHorizontal className="h-4 w-4" />
                Filter by mission type
              </div>
            </div>
          </div>

          {!products.length ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 py-24 text-center text-stone-400">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="font-medium">No products yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-sky-700 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-sky-100">Launch offer</p>
            <h2 className="mt-1 text-3xl font-semibold">Free shipping over {formatMoney(STORE.freeShippingThreshold)}</h2>
            <p className="mt-2 max-w-2xl text-sky-50">
              Stock up on batteries, propellers, filters, and field kits before your next flight.
            </p>
          </div>
          <Link
            href="#products"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-50"
          >
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
