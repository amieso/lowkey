'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { SunriseShader } from '@/components/intro/sunrise-shader'
import { videos } from '@/data/videos'

/**
 * /entry — "the eye opens" intro concept, staged end to end.
 *
 * One continuous idea in three beats:
 *   1. Gather — the full-width sunrise strip blooms on, holds a breath, then
 *      contracts laterally until it is exactly the closed-eye line: the light
 *      doesn't sit behind the eyelid, it *becomes* the eyelid. The shader's
 *      leading-edge bloom rides the tips inward as the light gathers.
 *   2. Open — the mark wakes under the gathered light: the lids part (SMIL
 *      morph, closed → open), the strip hands off to the warm rim (cooling to
 *      white), and the homepage first appears *inside the pupil*.
 *   3. Enter — the camera pushes through the pupil: a circular mask expands
 *      from the pupil to past the viewport while the mark scales with it, so
 *      the rim hugs the reveal edge and you pass through the eye. Content
 *      settles 1.06 → 1 like a dolly landing; the header mark fades in.
 *
 * Sandbox route mirroring /sunrise conventions — nothing wired into the real
 * homepage. A single master RAF owns the timeline: shader progress, phase
 * flips, and the mask-radius/eye-scale sync (both derive from the same eased
 * value each frame). Production version would trim ~20% off every beat and
 * keep the mediaReady gate from the live intro.
 */

// ── timeline (ms) ────────────────────────────────────────────────────────────
const T = {
  contractStart: 500, // full-width strip holds a breath, then gathers inward
  contractEnd: 1300, // strip is now exactly the closed-eye line
  eyeIn: 1100, // mark fades in under the gathering light, lids closed
  handoff: 1350, // strip fades out — the light is now the eyelid
  openStart: 1450, // lids part (600ms SMIL)
  peek: 1700, // content becomes visible inside the pupil
  revealStart: 1950, // push through the pupil
  revealEnd: 2700,
  settle: 2500, // header mark + kicker land during the final expansion
  done: 2950,
} as const

const PHASES = ['ignite', 'eyeIn', 'handoff', 'open', 'peek', 'reveal', 'settle', 'done'] as const
type Phase = (typeof PHASES)[number]

// Same paths as intro-logo.tsx — closed is a horizontal sliver, open is the lens.
const EYE_OPEN =
  'M8 4C10.0517 4 11.8618 4.52179 13.127 5.3125C14.4061 6.11201 15 7.08851 15 8C15 8.91149 14.4061 9.88799 13.127 10.6875C11.8618 11.4782 10.0517 12 8 12C5.9483 12 4.13819 11.4782 2.87305 10.6875C1.59387 9.88799 1 8.91149 1 8C1 7.08851 1.59387 6.11201 2.87305 5.3125C4.13819 4.52179 5.9483 4 8 4Z'
const EYE_CLOSED =
  'M8 7.8C10.0517 7.8 11.8618 7.85 13.127 7.9C14.4061 7.95 15 7.98 15 8C15 8.02 14.4061 8.05 13.127 8.1C11.8618 8.15 10.0517 8.2 8 8.2C5.9483 8.2 4.13819 8.15 2.87305 8.1C1.59387 8.05 1 8.02 1 8C1 7.98 1.59387 7.95 2.87305 7.9C4.13819 7.85 5.9483 7.8 8 7.8Z'

// The brand mark's proportional stroke (2/16 units) reads as a solid blob at
// hero scale — the cinematic version wants a hairline rim, like a lens edge.
const HERO_STROKE = 0.75

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const CARDS = videos.filter((v) => v.thumbnailUrl).slice(0, 9)

export default function EntryPage() {
  const progressRef = useRef(0)
  const rafRef = useRef(0)
  const clipRef = useRef<HTMLDivElement>(null) // content wrapper, circular mask
  const eyeScaleRef = useRef<HTMLDivElement>(null) // mark wrapper, scales with the mask
  const pupilRRef = useRef(0)
  const coverRRef = useRef(0)
  const pEyeRef = useRef(0.15) // shader progress at which the strip matches the closed-eye width
  const lastPhaseIdx = useRef(-1)

  const [phase, setPhase] = useState<Phase>('ignite')
  const [eyeSize, setEyeSize] = useState(280)
  const [runId, setRunId] = useState(0)

  const idx = PHASES.indexOf(phase)
  const at = (p: Phase) => idx >= PHASES.indexOf(p)

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const vw = window.innerWidth
    const vh = window.innerHeight
    const size = Math.round(Math.min(vh * 0.34, vw * 0.42))
    // Mask starts at the *inner* edge of the pupil stroke, so the stroke ring
    // always sits just outside the reveal edge during the push-through.
    pupilRRef.current = (size * (3 - HERO_STROKE / 2)) / 16
    coverRRef.current = Math.hypot(vw, vh) / 2 + size
    // Strip half-length is p × MAX_HALF_LEN(0.58) × viewport width; the closed
    // eye line spans 14/16 of the mark. Solve for p where the two coincide.
    pEyeRef.current = (size * 7) / 16 / (0.58 * vw)
    setEyeSize(size)

    progressRef.current = 0
    lastPhaseIdx.current = -1
    setPhase('ignite')
    setRunId((n) => n + 1)

    const start = performance.now()
    const tick = (now: number) => {
      const t = now - start

      // Sunrise progress — full width from frame one (the wrapper's opacity
      // blooms it on), then the strip gathers inward into the eyelid line.
      const u = clamp01((t - T.contractStart) / (T.contractEnd - T.contractStart))
      progressRef.current = lerp(1, pEyeRef.current, easeInOutCubic(u))

      // Phase flips, each fired once.
      let next: Phase = 'ignite'
      if (t >= T.done) next = 'done'
      else if (t >= T.settle) next = 'settle'
      else if (t >= T.revealStart) next = 'reveal'
      else if (t >= T.peek) next = 'peek'
      else if (t >= T.openStart) next = 'open'
      else if (t >= T.handoff) next = 'handoff'
      else if (t >= T.eyeIn) next = 'eyeIn'
      const nextIdx = PHASES.indexOf(next)
      if (nextIdx > lastPhaseIdx.current) {
        lastPhaseIdx.current = nextIdx
        setPhase(next)
      }

      // Mask + mark, driven off the same eased value so the rim hugs the edge.
      const pupilR = pupilRRef.current
      if (clipRef.current) {
        if (t >= T.revealStart) {
          const e = easeInOutCubic(clamp01((t - T.revealStart) / (T.revealEnd - T.revealStart)))
          const r = lerp(pupilR, coverRRef.current, e)
          clipRef.current.style.clipPath = `circle(${r}px at 50% 50%)`
          if (eyeScaleRef.current) {
            eyeScaleRef.current.style.transform = `scale(${r / pupilR})`
            eyeScaleRef.current.style.opacity = String(1 - smoothstep(0.5, 0.9, e))
          }
        } else {
          // Pupil mask grows open in sync with the lids — no disc before the
          // eye exists (its solid bg would otherwise punch out the strip).
          const r = pupilR * smoothstep(T.openStart, T.openStart + 600, t)
          clipRef.current.style.clipPath = `circle(${r}px at 50% 50%)`
        }
      }

      if (t < T.done) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    play()
    return () => cancelAnimationFrame(rafRef.current)
  }, [play])

  return (
    <div key={runId} className="fixed inset-0 overflow-hidden bg-[#0a0a0a] text-white">
      {/* CSS fallback (shows if WebGL is unavailable): a centred horizontal glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120vw 22vh at 50% 50%, rgba(255,150,80,0.55), rgba(176,58,110,0.18) 40%, transparent 70%)',
          opacity: at('handoff') ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
        }}
      />

      {/* GPU sunrise — blooms on at full width, gathers into the eyelid, then
          hands the light off to the mark */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: at('handoff') ? 0 : 1 }}
        transition={{ duration: at('handoff') ? 0.3 : 0.25, ease: 'easeOut' }}
      >
        <SunriseShader progressRef={progressRef} className="h-full w-full" />
      </motion.div>

      {/* Homepage, masked by the pupil circle — first visible inside the eye,
          then the mask expands past the viewport during the push-through. */}
      <div
        ref={clipRef}
        className="absolute inset-0 z-10 bg-[#0a0a0a]"
        style={{ clipPath: 'circle(0px at 50% 50%)', willChange: 'clip-path' }}
      >
        <motion.div
          className="flex h-full flex-col items-center justify-center px-6"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{
            opacity: at('peek') ? 1 : 0,
            scale: at('reveal') ? 1 : 1.06,
          }}
          transition={{
            opacity: { duration: 0.3, ease: 'easeOut' },
            scale: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <motion.p
            className="mb-10 text-sm uppercase tracking-[0.2em] text-white/40"
            initial={{ opacity: 0, y: 10 }}
            animate={at('settle') ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            Launch videos, curated
          </motion.p>
          <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-3">
            {CARDS.map((v) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={v.id}
                src={v.thumbnailUrl}
                alt={v.title}
                className="aspect-video w-full rounded-xl object-cover ring-1 ring-white/[0.06]"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* The mark: wakes on the light line, lids part, then scales with the
          mask so you pass through the pupil. Warm while it holds the light,
          cooling to white as the site takes over. */}
      <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, color: '#ffd9a8' }}
          animate={{
            opacity: at('eyeIn') ? 1 : 0,
            color: at('reveal') ? '#ffffff' : '#ffd9a8',
            filter: at('eyeIn')
              ? 'drop-shadow(0 0 16px rgba(255, 190, 120, 0.3))'
              : 'drop-shadow(0 0 0px rgba(255, 190, 120, 0))',
          }}
          transition={{
            opacity: { duration: 0.35, ease: 'easeOut' },
            color: { duration: 0.5, ease: 'easeOut' },
            filter: { duration: 0.6, ease: 'easeOut' },
          }}
        >
          <div ref={eyeScaleRef} style={{ width: eyeSize, height: eyeSize, willChange: 'transform' }}>
            <EyeOpen open={at('open')} />
          </div>
        </motion.div>
      </div>

      {/* Header mark lands quietly during the final expansion */}
      <motion.div
        className="absolute left-1/2 z-30 -translate-x-1/2"
        style={{ top: 52 }}
        initial={{ opacity: 0, y: 6 }}
        animate={at('settle') ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="h-11 w-11 -translate-y-1/2">
          <Mark />
        </div>
      </motion.div>

      {/* Replay */}
      <button
        onClick={play}
        className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/15"
      >
        Replay entry
      </button>
    </div>
  )
}

/** The mark with SMIL lid morph: mounts closed, opens once when `open` flips. */
function EyeOpen({ open }: { open: boolean }) {
  const eyeRef = useRef<SVGAnimateElement>(null)
  const clipRef = useRef<SVGAnimateElement>(null)

  useEffect(() => {
    if (open) {
      eyeRef.current?.beginElement()
      clipRef.current?.beginElement()
    }
  }, [open])

  const lidAnim = {
    attributeName: 'd',
    dur: '0.6s',
    begin: 'indefinite',
    values: `${EYE_CLOSED};${EYE_OPEN}`,
    keyTimes: '0; 1',
    calcMode: 'spline',
    keySplines: '0.32 0 0.12 1',
    fill: 'freeze' as const,
  }

  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-full w-full">
      <defs>
        <clipPath id="entryEyeClip">
          <path d={EYE_CLOSED}>
            <animate ref={clipRef} {...lidAnim} />
          </path>
        </clipPath>
      </defs>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth={HERO_STROKE} />
      <path d={EYE_CLOSED} stroke="currentColor" strokeWidth={HERO_STROKE}>
        <animate ref={eyeRef} {...lidAnim} />
      </path>
      <g clipPath="url(#entryEyeClip)">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth={HERO_STROKE} />
      </g>
    </svg>
  )
}

function Mark() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-full w-full text-white">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
      <path d={EYE_OPEN} stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
