'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SunriseShader } from '@/components/intro/sunrise-shader'

/**
 * /sunrise — preview harness for the sunrise light-strip intro alternative.
 *
 * Plays the GPU light strip (~1.3s) expanding laterally from the centre, then
 * hands off to the eye mark at the top — mirroring how the live eye intro
 * settles its logo into the header. Mock content fades in beneath so the whole
 * motion reads in context. This is a sandbox — nothing here is wired into the
 * real homepage yet.
 */

const RISE_MS = 1300 // strip expand time (snappy, per design)
const HANDOFF_MS = 600 // strip → eye-at-top travel + content reveal

// The strip sits at the vertical centre; the eye chip begins there.
const STRIP_TOP_PCT = 50
const CHIP_START_VH = 9

type Phase = 'rising' | 'handoff' | 'done'

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export default function SunrisePage() {
  const progressRef = useRef(0)
  const [phase, setPhase] = useState<Phase>('rising')
  const rafRef = useRef(0)

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    progressRef.current = 0
    setPhase('rising')

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / RISE_MS, 1)
      progressRef.current = easeOutCubic(t)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setPhase('handoff')
        setTimeout(() => setPhase('done'), HANDOFF_MS)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    play()
    return () => cancelAnimationFrame(rafRef.current)
  }, [play])

  const settling = phase === 'handoff' || phase === 'done'

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0a] text-white">
      {/* CSS fallback (shows if WebGL is unavailable): a centred horizontal glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120vw 22vh at 50% 50%, rgba(255,150,80,0.55), rgba(176,58,110,0.18) 40%, transparent 70%)',
          opacity: settling ? 0 : 1,
          transition: 'opacity 0.4s ease-out',
        }}
      />

      {/* GPU sunrise */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 1 }}
        animate={{ opacity: settling ? 0 : 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <SunriseShader progressRef={progressRef} className="h-full w-full" />
      </motion.div>

      {/* Mock content revealed beneath the intro */}
      <AnimatePresence>
        {settling && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center px-6 pt-32"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
          >
            <p className="mb-10 text-sm uppercase tracking-[0.2em] text-white/40">
              Launch videos, curated
            </p>
            <div className="grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eye mark: cross-fades in over the sun, then travels to the top —
          the same "big mark shrinks into the header" beat as the live intro. */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: 0 }}
        initial={false}
        animate={
          settling
            ? { top: '52px', height: 44, opacity: 1 }
            : { top: `${STRIP_TOP_PCT}vh`, height: `${CHIP_START_VH}vh`, opacity: 0 }
        }
        transition={{
          top: { duration: HANDOFF_MS / 1000, ease: [0.23, 1, 0.32, 1] },
          height: { duration: HANDOFF_MS / 1000, ease: [0.23, 1, 0.32, 1] },
          opacity: { duration: 0.35, ease: 'easeOut' },
        }}
      >
        {/* aspect-square via height drives width; center on its own origin */}
        <div className="aspect-square h-full -translate-y-1/2">
          <EyeMark />
        </div>
      </motion.div>

      {/* Replay */}
      <button
        onClick={play}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/15"
      >
        Replay sunrise
      </button>
    </div>
  )
}

function EyeMark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-full w-full text-white">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 4C10.0517 4 11.8618 4.52179 13.127 5.3125C14.4061 6.11201 15 7.08851 15 8C15 8.91149 14.4061 9.88799 13.127 10.6875C11.8618 11.4782 10.0517 12 8 12C5.9483 12 4.13819 11.4782 2.87305 10.6875C1.59387 9.88799 1 8.91149 1 8C1 7.08851 1.59387 6.11201 2.87305 5.3125C4.13819 4.52179 5.9483 4 8 4Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
