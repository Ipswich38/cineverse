import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldCheck, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ProductActions from '@/components/product-actions'
import { hasSupabaseConfig, supabase, type Product } from '@/lib/supabase'
import { DEMO_PRODUCTS, PRODUCT_HIGHLIGHTS, formatMoney } from '@/lib/storefront'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string) {
  if (!hasSupabaseConfig()) {
    return DEMO_PRODUCTS.find((item) => item.slug === slug) ?? null
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return DEMO_PRODUCTS.find((item) => item.slug === slug) ?? null
  }

  return data as Product
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-stone-950">Product not found</h1>
        <p className="mt-2 text-stone-500">This item may be unavailable or inactive.</p>
        <Link href="/#products" className="mt-6 inline-flex h-10 items-center rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800">
          Back to products
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-stone-100">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <Badge variant="outline" className="mb-3 border-emerald-200 bg-emerald-50 text-emerald-800">
              {product.category}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-normal text-stone-950">{product.name}</h1>
          </div>

          <p className="text-3xl font-semibold">{formatMoney(product.price)}</p>

          <p className="max-w-xl leading-7 text-stone-600">{product.description}</p>

          <div className="text-sm">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                In stock ({product.stock} available)
              </span>
            ) : (
              <span className="font-medium text-red-500">Out of stock</span>
            )}
          </div>

          <ProductActions product={product} />

          <div className="grid gap-3 border-y border-stone-200 py-5 sm:grid-cols-3">
            {PRODUCT_HIGHLIGHTS.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <Icon className="mb-2 h-5 w-5 text-emerald-700" />
                <p className="text-sm font-semibold text-stone-950">{label}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg bg-stone-50 p-4">
              <Truck className="h-5 w-5 shrink-0 text-emerald-700" />
              <p>Free delivery unlocks above ₱1,500.</p>
            </div>
            <div className="flex gap-3 rounded-lg bg-stone-50 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
              <p>Checkout redirects to a secure PayMongo payment page.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
