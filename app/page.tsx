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
      {/* Dark cinematic hero (brand bridge with CineForce) */}
      <section className="relative overflow-hidden bg-[#0c0c0f]">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: 'radial-gradient(60% 120% at 50% -10%, rgba(255,204,0,0.10), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-14 text-center sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FFCC00]">Equipping your next vision</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-[32px] font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-[46px]">
            Production-ready gear, ready when you are.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
            Rent or buy camera, lighting, grip, and audio from owners across the Philippines — and hire crew on CineForce.
          </p>
        </div>
      </section>

      {/* Search + categories + grid (light for conversion) */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-10">
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
