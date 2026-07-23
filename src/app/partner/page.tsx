import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { PARTNER_OPTIONS, partnerMailto } from '@/data/partner'
import { PartnerCtaLink } from '@/components/partner/partner-cta-link'

export const metadata: Metadata = {
  title: 'Partner with Lowkey',
  description: 'Advertise, get launch support, or submit your launch video to Lowkey.',
}

// Note: ad blockers strip elements whose id contains "advertise"/"ad-", so the
// Advertise option keeps a neutral id ('reach') to survive cosmetic filtering.
const PRIMARY_IDS = ['reach']
const PRIMARY_OPTIONS = PRIMARY_IDS.map((id) => PARTNER_OPTIONS.find((o) => o.id === id)!)
const SECONDARY_OPTIONS = PARTNER_OPTIONS.filter((o) => !PRIMARY_IDS.includes(o.id))

export default function PartnerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[880px] px-4 sm:px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-medium text-foreground tracking-tight leading-[1.1] mb-4">
          Partner with us
        </h1>
        <p className="text-sm md:text-base text-muted leading-relaxed max-w-xl mb-12">
          Lowkey is where founders, designers, and product teams come to study the best launch
          videos. Here are a few ways to work with us.
        </p>

        {/* Primary options - featured side by side (single one spans full width) */}
        <div
          className={`grid grid-cols-1 gap-4 ${PRIMARY_OPTIONS.length > 1 ? 'sm:grid-cols-2' : ''}`}
        >
          {PRIMARY_OPTIONS.map((option) => (
            <section
              key={option.id}
              id={option.id}
              className="scroll-mt-28 flex flex-col rounded-lg border border-border bg-surface p-6 sm:p-8"
            >
              <h2 className="text-lg font-medium text-foreground mb-3">{option.name}</h2>
              <p className="text-sm text-muted leading-relaxed mb-6 flex-1">{option.description}</p>
              <PartnerCtaLink
                href={partnerMailto(option)}
                optionId={option.id}
                className="inline-flex h-9 w-fit items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-80"
              >
                Get in touch
              </PartnerCtaLink>
            </section>
          ))}
        </div>

        {/* Secondary options - deemphasized */}
        <div className="mt-10">
          <div className="divide-y divide-border rounded-lg border border-border">
            {SECONDARY_OPTIONS.map((option) => (
              <PartnerCtaLink
                key={option.id}
                href={partnerMailto(option)}
                optionId={option.id}
                id={option.id}
                className="group flex items-center justify-between gap-4 scroll-mt-28 px-5 py-4 transition-colors hover:bg-surface"
              >
                <div>
                  <h2 className="text-sm font-medium text-muted group-hover:text-foreground transition-colors">
                    {option.name}
                  </h2>
                  <p className="text-sm text-muted-dark leading-relaxed">{option.tagline}</p>
                </div>
                <span className="text-sm text-muted-dark group-hover:text-foreground transition-colors shrink-0">
                  Get in touch →
                </span>
              </PartnerCtaLink>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
