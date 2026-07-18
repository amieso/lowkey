'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AnimatedLogo } from '@/components/ui/animated-logo'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { useIntroContext } from '@/context/intro-context'

// How long the logo (and the partner button beside it) trails the intro's
// 'settling' signal. The grid cards key off the same signal but lead it, so
// the row is already arriving as the logo flies up into the header.
const LOGO_LEAD_S = 0.4

export function Header() {
  const { introComplete, shouldShowIntro, introPhase } = useIntroContext()

  // Logo should be visible if: no intro needed OR intro is settling/done
  const showLogo = !shouldShowIntro || introPhase === 'settling' || introPhase === 'done'
  const isSettling = shouldShowIntro && introPhase === 'settling'

  // Calculate starting position (center of screen relative to header position)
  const getStartY = () => {
    if (typeof window === 'undefined') return 348
    // Header logo is at roughly y=52 from top, center is at windowHeight/2
    return window.innerHeight / 2 - 52
  }

  return (
    <header className="sticky top-0 z-40 w-full pb-2">
      {/* Progressive blur layers */}
      <div className="absolute inset-0 backdrop-blur-[16px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_25%)]" />
      <div className="absolute inset-0 backdrop-blur-[12px] [mask-image:linear-gradient(to_bottom,black_10%,transparent_40%)]" />
      <div className="absolute inset-0 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,black_20%,transparent_55%)]" />
      <div className="absolute inset-0 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,black_35%,transparent_70%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black_50%,transparent_85%)]" />
      <div className="absolute inset-0 backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-transparent" />
      <div className="relative px-4 md:px-6">
        <div className="flex h-16 items-center justify-center pt-6 sm:pt-9">
          {/* Logo - animates from center to header during settling phase.
              Phase-driven (not mount-driven) so it flies in at the reveal even
              though the header now mounts at the very start of the intro. */}
          <Link href="/" className="flex items-center">
            <motion.div
              initial={shouldShowIntro ? {
                opacity: 0,
                scale: 160 / 44,
                y: getStartY()
              } : {
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              animate={showLogo ? {
                opacity: 1,
                scale: 1,
                y: 0,
              } : {
                opacity: 0,
                scale: 160 / 44,
                y: getStartY(),
              }}
              transition={isSettling ? {
                scale: { duration: 0.7, delay: LOGO_LEAD_S, ease: [0.23, 1, 0.32, 1] },
                y: { duration: 0.7, delay: LOGO_LEAD_S, ease: [0.23, 1, 0.32, 1] },
                opacity: { duration: 0.15, delay: LOGO_LEAD_S, ease: 'easeIn' },
              } : {
                duration: 0.2,
              }}
            >
              <AnimatedLogo isHovered={introComplete} />
            </motion.div>
          </Link>

          {/* Partner button - top right */}
          <motion.div
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 mt-3 sm:mt-[18px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: showLogo ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isSettling ? LOGO_LEAD_S : 0 }}
          >
            <div className="flex items-center gap-2">
              <Link
                href="https://x.com/viewlowkey"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex h-9 items-center rounded-full px-4 text-sm text-muted hover:text-foreground transition-colors"
              >
                Follow on X
              </Link>
              <LiquidGlass>
                <Link
                  href="/partner"
                  className="inline-flex h-9 items-center rounded-full bg-foreground/5 px-4 text-sm text-foreground hover:bg-foreground/10 transition-colors"
                >
                  Partner with us
                </Link>
              </LiquidGlass>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}
