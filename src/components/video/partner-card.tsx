'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PARTNER_OPTIONS, partnerMailto } from '@/data/partner'
import { PartnerCtaLink } from '@/components/partner/partner-cta-link'
import { lockScroll, unlockScroll } from '@/lib/scroll-lock'

const SHARED_LAYOUT_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const

const primary = PARTNER_OPTIONS.find((option) => option.id === 'reach') ?? PARTNER_OPTIONS[0]
const secondary = PARTNER_OPTIONS.filter((option) => option.id !== primary.id)

interface PartnerCardProps {
  isExpanded?: boolean
  onSelect?: () => void
  onClose?: () => void
}

export function PartnerCard({ isExpanded = false, onSelect, onClose }: PartnerCardProps) {
  // Stay stacked above sibling cards until the collapse morph finishes,
  // otherwise the panel slides back *under* the cards that follow it.
  const [isCollapsing, setIsCollapsing] = useState(false)
  const prevExpandedRef = useRef(isExpanded)
  if (prevExpandedRef.current !== isExpanded) {
    prevExpandedRef.current = isExpanded
    if (!isExpanded) setIsCollapsing(true)
  }
  const elevated = isExpanded || isCollapsing

  useEffect(() => {
    if (!isExpanded) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded, onClose])

  useEffect(() => {
    if (!isExpanded) return
    lockScroll()
    return unlockScroll
  }, [isExpanded])

  // The hrefs stay real (crawlers and cmd-click get the /partner page); only a
  // plain left click is intercepted to open the lightbox in place.
  const handleOpenClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onSelect?.()
  }

  return (
    <article className={`group relative ${elevated ? 'z-[130]' : ''} ${isExpanded ? 'pointer-events-none' : ''}`}>
      {/* Reserved grid slot — matches the video card so the grid stays stable */}
      <div className="relative aspect-video w-full">
        <motion.div
          layout
          transition={SHARED_LAYOUT_TRANSITION}
          onLayoutAnimationComplete={() => { if (!isExpanded) setIsCollapsing(false) }}
          style={{ borderRadius: isExpanded ? 12 : 6 }}
          className={
            isExpanded
              ? 'fixed inset-0 z-[130] m-auto h-fit max-h-[calc(100svh-4rem)] w-[min(640px,calc(100vw-2rem))] overflow-y-auto border border-foreground/15 bg-surface shadow-2xl pointer-events-auto'
              : 'absolute inset-0 flex flex-col overflow-hidden border border-foreground/15 bg-surface transition-colors group-hover:border-foreground/25'
          }
          role={isExpanded ? 'dialog' : undefined}
          aria-modal={isExpanded || undefined}
          aria-label={isExpanded ? 'Partner with us' : undefined}
        >
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.2 }}
              className="p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-medium text-foreground tracking-tight">Partner with us</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base leading-none text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Lowkey is where founders, designers, and product teams come to study the best launch
                videos. Here are a few ways to work with us.
              </p>

              <div className="mt-6 rounded-lg border border-border bg-background/40 p-5 sm:p-6">
                <h3 className="text-base font-medium text-foreground">{primary.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{primary.description}</p>
                <PartnerCtaLink
                  href={partnerMailto(primary)}
                  optionId={primary.id}
                  className="mt-5 inline-flex h-9 w-fit items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-80"
                >
                  Get in touch
                </PartnerCtaLink>
              </div>

              <div className="mt-4 divide-y divide-border rounded-lg border border-border">
                {secondary.map((option) => (
                  <PartnerCtaLink
                    key={option.id}
                    href={partnerMailto(option)}
                    optionId={option.id}
                    className="group/row flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-foreground/[0.03]"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-muted transition-colors group-hover/row:text-foreground">
                        {option.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-dark">{option.tagline}</p>
                    </div>
                    <span className="shrink-0 text-sm text-muted-dark transition-colors group-hover/row:text-foreground">
                      Get in touch →
                    </span>
                  </PartnerCtaLink>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
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
                onClick={handleOpenClick}
                className="relative flex flex-1 flex-col justify-center px-4 sm:px-5 transition-colors hover:bg-foreground/[0.04]"
              >
                <span className="block text-lg sm:text-xl font-medium leading-tight text-foreground">
                  {primary.name}
                </span>
                <span className="mt-1 block text-xs sm:text-sm text-muted">{primary.tagline}</span>
              </Link>

              <Link
                href="/partner"
                onClick={handleOpenClick}
                className="relative flex items-center border-t border-foreground/10 px-4 sm:px-5 py-2.5 text-xs text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
              >
                Other ways to partner
              </Link>
            </>
          )}
        </motion.div>
      </div>

      {/* Info row mirrors the video card's caption line — hidden while expanded */}
      <div className={`flex items-center justify-between gap-2 pt-[14px] pb-1.5 ${isExpanded ? 'invisible' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs text-muted shrink-0">Lowkey</span>
          <span className="text-xs text-foreground truncate">Partner with us</span>
        </div>
        <span className="text-xs text-muted shrink-0 font-mono">Partner</span>
      </div>
    </article>
  )
}
