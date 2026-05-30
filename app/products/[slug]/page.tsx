import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ShieldCheck, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ListingBooking from '@/components/listing-booking'
import ProductCard from '@/components/product-card'
import { hasSupabaseConfig, supabase, type Product } from '@/lib/supabase'
import { DEMO_PRODUCTS, PRODUCT_HIGHLIGHTS, formatMoney, getProductRecommendations } from '@/lib/storefront'

export const dynamic = 'force-dynamic'

async function getListing(slug: string) {
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

async function getListings() {
  if (!hasSupabaseConfig()) return DEMO_PRODUCTS

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error || !data?.length) return DEMO_PRODUCTS
  return data as Product[]
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [product, listings] = await Promise.all([getListing(slug), getListings()])

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-[#111827]">Listing not found</h1>
        <p className="mt-2 text-[#6b7280]">This gear may be unavailable or inactive.</p>
        <Link href="/#gear" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white hover:bg-[#111827]/85">
          Browse gear
        </Link>
      </div>
    )
  }

  const recommendations = getProductRecommendations(product, listings)
  const ownerFirst = product.owner_name?.split(' ')[0]

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/#gear" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" />
        Browse gear
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* Left: image + details */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f3f4f6]">
            <Image src={product.image_url} alt={product.name} fill className="object-cover" priority />
          </div>

          <div className="mt-6">
            <Badge variant="outline" className="mb-3 border-[#C5A059]/30 bg-[#f6efdf] text-[#a8843e]">
              {product.category}
            </Badge>
            <h1 className="text-[32px] font-semibold tracking-[-0.01em] text-[#111827]">{product.name}</h1>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[22px] font-semibold text-[#111827]">{formatMoney(product.price)}</span>
              <span className="text-[14px] text-[#6b7280]">/day</span>
            </div>

            {product.owner_name && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[13px] text-[#111827]">
                <Store className="h-3.5 w-3.5 text-[#6b7280]" />
                Owned by <span className="font-semibold">{ownerFirst}</span>
              </p>
            )}

            <p className="mt-5 max-w-xl leading-7 text-[#3a3a3c]">{product.description}</p>

            <div className="mt-5 text-sm">
              {product.stock > 0 ? (
                <span className="inline-flex items-center gap-2 font-medium text-[#a8843e]">
                  <CheckCircle2 className="h-4 w-4" />
                  {product.stock} unit(s) available
                </span>
              ) : (
                <span className="font-medium text-[#ff3b30]">Fully booked</span>
              )}
            </div>

            <div className="mt-6 grid gap-3 border-y border-black/[0.06] py-5 sm:grid-cols-3">
              {PRODUCT_HIGHLIGHTS.map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon className="mb-2 h-5 w-5 text-[#C5A059]" />
                  <p className="text-sm font-semibold text-[#111827]">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#6b7280]">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-3 rounded-xl bg-[#f3f4f6] p-4 text-sm text-[#3a3a3c]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#C5A059]" />
              <p>Reserve with 30% via PayMongo; pay the balance through CineVerse before your shoot. We handle delivery, pickup, and return — and pay the owner after a clean return.</p>
            </div>
          </div>
        </div>

        {/* Right: sticky booking panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ListingBooking product={product} />
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-16">
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8843e]">Pairs well for your shoot</p>
            <h2 className="text-2xl font-semibold text-[#111827]">Complete the kit</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
