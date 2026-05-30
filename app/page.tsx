import StorefrontBrowser from '@/components/storefront-browser'
import { hasSupabaseConfig, supabase, type Product } from '@/lib/supabase'
import { DEMO_PRODUCTS, TRUST_POINTS } from '@/lib/storefront'

export const dynamic = 'force-dynamic'

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

export default async function HomePage() {
  const listings = await getListings()

  return (
    <>
      {/* Search + categories sit directly below the navbar */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8">
          <StorefrontBrowser listings={listings} />
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-black/[0.06] bg-[#f3f4f6]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-2 md:grid-cols-4">
          {TRUST_POINTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-6">
              <Icon className="h-5 w-5 shrink-0 text-[#C5A059]" />
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
                <p className="text-[12px] text-[#6b7280]">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
