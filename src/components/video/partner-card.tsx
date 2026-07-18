import Link from 'next/link'
import { PARTNER_OPTIONS } from '@/data/partner'

const primary = PARTNER_OPTIONS.find((option) => option.id === 'reach') ?? PARTNER_OPTIONS[0]

export function PartnerCard() {
  return (
    <article className="group">
      {/* Matches the reserved video-card slot so it aligns with sibling cards */}
      <div className="relative aspect-video w-full">
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-md border border-foreground/15 bg-surface transition-colors group-hover:border-foreground/25">
          {/* Soft top-left wash so the card reads as a slot, not a hole in the grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(120% 100% at 0% 0%, rgba(250,250,250,0.10) 0%, rgba(250,250,250,0.03) 40%, transparent 70%)',
            }}
          />

          <Link
            href={`/partner#${primary.id}`}
            className="relative flex flex-1 flex-col justify-center px-4 sm:px-5 transition-colors hover:bg-foreground/[0.04]"
          >
            <span className="block text-lg sm:text-xl font-medium leading-tight text-foreground">
              {primary.name}
            </span>
            <span className="mt-1 block text-xs sm:text-sm text-muted">{primary.tagline}</span>
          </Link>

          <Link
            href="/partner"
            className="relative flex items-center border-t border-foreground/10 px-4 sm:px-5 py-2.5 text-xs text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            Other ways to partner
          </Link>
        </div>
      </div>

      {/* Info row mirrors the video card's caption line */}
      <div className="flex items-center justify-between gap-2 pt-[14px] pb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs text-muted shrink-0">Lowkey</span>
          <span className="text-xs text-foreground truncate">Partner with us</span>
        </div>
        <span className="text-xs text-muted shrink-0 font-mono">Partner</span>
      </div>
    </article>
  )
}
