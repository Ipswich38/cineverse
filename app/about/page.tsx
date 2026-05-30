import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { RENTAL_FLOW, STORE, TRUST_POINTS } from '@/lib/storefront'

export const metadata = {
  title: `About — ${STORE.name}`,
  description: STORE.tagline,
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-4xl px-5 pb-12 pt-16 text-center sm:pt-24">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-[#111827] sm:text-[56px]">
            Rent production gear,<br className="hidden sm:block" /> book an operator, shoot.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#6b7280]">
            {STORE.tagline} Reserve with a 30% downpayment — settle the balance with the owner on handover.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/#gear"
              className={buttonVariants({ size: 'lg', className: 'h-12 bg-[#C5A059] px-7 text-[#111827] hover:bg-[#a8843e]' })}
            >
              Browse gear
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f3f4f6]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="mb-8 text-[24px] font-semibold tracking-[-0.01em] text-[#111827]">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {RENTAL_FLOW.map((step, i) => (
              <div key={step.key} className="rounded-2xl bg-white p-5">
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[12px] font-semibold text-white">
                  {i + 1}
                </div>
                <p className="text-[14px] font-semibold text-[#111827]">{step.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why CineVerse */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="mb-8 text-[24px] font-semibold tracking-[-0.01em] text-[#111827]">Why {STORE.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="rounded-2xl border border-black/[0.06] p-5">
                <Icon className="mb-3 h-6 w-6 text-[#C5A059]" />
                <p className="text-[15px] font-semibold text-[#111827]">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-[#111827] p-8 text-center sm:p-12">
            <h3 className="text-[24px] font-semibold text-white">Ready to gear up?</h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-white/60">
              Browse cameras, lighting, grip, audio, drones, and more from owners across the Philippines.
            </p>
            <Link
              href="/#gear"
              className={buttonVariants({ size: 'lg', className: 'mt-6 h-12 bg-white px-7 text-[#111827] hover:bg-white/90' })}
            >
              Browse gear
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
