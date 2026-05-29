import StorefrontBrowser from '@/components/storefront-browser'
import { hasSupabaseConfig, supabase, type Product } from '@/lib/supabase'
import { DEMO_PRODUCTS, STORE, TRUST_POINTS, RENTAL_FLOW } from '@/lib/storefront'

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
      {/* Hero — minimal, search-first */}
      <section className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-16 text-center sm:pt-24">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#1d1d1f] sm:text-[56px]">
            Rent production gear,<br className="hidden sm:block" /> book an operator, shoot.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#6e6e73]">
            {STORE.tagline} Reserve with a {`30%`} downpayment — settle the balance with the owner on handover.
          </p>
        </div>
      </section>

      {/* Browser */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <StorefrontBrowser listings={listings} />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 bg-[#f5f5f7]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="mb-8 text-[24px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {RENTAL_FLOW.map((step, i) => (
              <div key={step.key} className="rounded-2xl bg-white p-5">
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1f] text-[12px] font-semibold text-white">
                  {i + 1}
                </div>
                <p className="text-[14px] font-semibold text-[#1d1d1f]">{step.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#6e6e73]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-2 md:grid-cols-4">
          {TRUST_POINTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3 px-4 py-6">
              <Icon className="h-5 w-5 shrink-0 text-[#0071e3]" />
              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{label}</p>
                <p className="text-[12px] text-[#6e6e73]">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
