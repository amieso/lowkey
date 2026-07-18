'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { videos } from '@/data/videos'

/**
 * /supercut — "the whole catalog in a blink" intro concept.
 *
 * One rectangle, centered, covering ~80% of the screen, plays a supercut of
 * the entire catalog: one frame from every launch video. While the cut runs,
 * the rectangle shrinks and glides — in one continuous move — into the exact
 * slot of the first video card in the grid, its corners morphing from
 * razor-sharp to the card's 12px radius. The cut is ordered oldest → newest
 * so the last flashed frame IS the first card's thumbnail: the rectangle
 * lands and simply *is* the card. The rest of the grid then staggers in.
 *
 * Treatments (each a panel toggle; flipping one replays the cut):
 *   - Halftone: printed-dot screen over the flashes, dissolving on landing.
 *   - Speed ramp: early frames hold ~3.5 ticks, accelerating to 1 tick at
 *     the end — the classic supercut crescendo.
 *   - CRT power-on: a pre-roll where the first frame collapses to a bright
 *     horizontal line that expands vertically while a white bloom decays.
 *   - Sound: a pitched shutter click per frame swap over a low projector
 *     hum. Browsers only allow audio after a user gesture, so the auto-play
 *     is mute; it kicks in from the first replay/toggle.
 *
 * Sandbox route mirroring /entry conventions — nothing wired into the real
 * homepage. Mechanics:
 *   - Frames are preloaded via fetch → blob → object URL (Chrome stalls
 *     <img> loads in hidden tabs; fetch runs at full speed) behind one
 *     global deadline, and stacked as <img>s toggled via refs.
 *   - FLIP: the overlay is laid out at the measured card rect and animated
 *     from a translate+scale start transform to identity, so the shrink is
 *     pure compositor work. Both rects are 16:9, so the scale is uniform;
 *     the border-radius morph divides the scale back out per tick so the
 *     on-screen radius is an exact 0 → 12px ease.
 *   - The cut runs off a precomputed dwell schedule (entries of frame+dur);
 *     the shrink is driven by elapsed time over the schedule's total and
 *     stays in sync with the last frame on any refresh rate. The CRT
 *     power-on is a pre-roll before the schedule.
 *   - Per-swap randomness (click pitch) is seeded by entry index, so
 *     replays are identical.
 */

// ── timing ───────────────────────────────────────────────────────────────────
const TICK_MS = 1000 / 60
// Dwell per image without the speed ramp, in 60fps ticks.
const FRAMES_PER_IMAGE = 2
// Speed ramp: dwell eases from RAMP_START ticks down to RAMP_END.
const RAMP_START = 5
const RAMP_END = 1
// Global trim (~30% shorter cut). Dwells are clamped to ≥1 tick so the
// crescendo never drops frames on a 60Hz display.
const CUT_SCALE = 0.7
const CRT_ON_MS = 240
const START_COVER = 0.8 // the cut starts covering 80% of the viewport
const GRID_STAGGER = 0.04 // per-card delay once the overlay has landed

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Deterministic per-index noise so every replay sounds identical.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Newest first, like the real homepage grid — ITEMS[0] is the first card.
const ITEMS = videos
  .filter((v) => v.thumbnailUrl)
  .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
const CARDS = ITEMS.slice(0, 9)

// 640px to match the production intro: each frame flashes for a few ticks
// under the halftone screen, so the resolution is invisible — and 640 is
// the exact variant the grid cards request, so the Mux CDN has it hot.
const flashSrc = (thumbnailUrl: string) =>
  `${thumbnailUrl}${thumbnailUrl.includes('?') ? '&' : '?'}width=640`

// Chronological cut (oldest → newest): the sequence crescendos into the
// newest video, which is exactly the card the rectangle lands on.
const FLASH_SRCS = [...ITEMS.slice(1)]
  .reverse()
  .map((v) => flashSrc(v.thumbnailUrl!))
  .concat(flashSrc(ITEMS[0].thumbnailUrl!))

type Phase = 'loading' | 'cut' | 'landed' | 'done'

type Fx = {
  halftone: boolean
  ramp: boolean
  crtOn: boolean
  sound: boolean
}

const FX_DEFS: { key: keyof Fx; label: string }[] = [
  { key: 'halftone', label: 'Halftone' },
  { key: 'ramp', label: 'Speed ramp' },
  { key: 'crtOn', label: 'CRT power-on' },
  { key: 'sound', label: 'Sound' },
]

const withAll = (on: boolean) => Object.fromEntries(FX_DEFS.map(({ key }) => [key, on])) as Fx

// Projector audio rig — created lazily on the first sound-enabled play().
type AudioRig = {
  ctx: AudioContext
  master: GainNode
  noise: AudioBuffer
  hum: { osc: OscillatorNode; gain: GainNode } | null
}

export default function SupercutPage() {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [fx, setFx] = useState<Fx>(withAll(true))

  const overlayRef = useRef<HTMLDivElement>(null)
  const bloomRef = useRef<HTMLDivElement>(null)
  const firstCardRef = useRef<HTMLDivElement>(null)
  const frameEls = useRef<(HTMLImageElement | null)[]>([])
  const audioRef = useRef<AudioRig | null>(null)
  const rafRef = useRef(0)
  const doneTimerRef = useRef(0)

  // ── preload every frame ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const objectUrls: string[] = []
    // fetch → blob → object URL, NOT new Image(): Chrome stalls <img> loads
    // completely in hidden tabs (they're rendering-priority work), while
    // fetch() runs at full speed. Blob URLs also guarantee the stacked flash
    // <img>s can never refetch — the bytes are already local.
    const load = async (src: string): Promise<string | null> => {
      try {
        const res = await fetch(src)
        if (!res.ok) return null
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        objectUrls.push(url)
        return url
      } catch {
        return null
      }
    }
    const results: (string | null)[] = new Array<string | null>(FLASH_SRCS.length).fill(null)
    const all = Promise.all(FLASH_SRCS.map((s, i) => load(s).then((u) => void (results[i] = u))))
    // One global deadline instead of per-image timeouts — per-image clocks
    // unfairly kill the connection-queue tail. On deadline we start with
    // whatever made it; a dropped frame just shortens the cut by one tick.
    const deadline = new Promise<void>((resolve) => window.setTimeout(resolve, 20000))
    Promise.race([all, deadline]).then(() => {
      if (!alive) return
      const landingIdx = FLASH_SRCS.length - 1
      // Catalog order is preserved, and the landing frame is always kept last
      // (falling back to the remote URL if its fetch failed) — without it the
      // rectangle would land showing the wrong video.
      const landing = results[landingIdx] ?? FLASH_SRCS[landingIdx]
      const ok = results.slice(0, landingIdx).filter((u): u is string => u !== null)
      setFrames([...ok, landing])
    })
    return () => {
      alive = false
      objectUrls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  // ── projector audio ────────────────────────────────────────────────────────
  const ensureAudio = useCallback((): AudioRig | null => {
    if (audioRef.current) return audioRef.current
    try {
      const ctx = new AudioContext()
      const master = ctx.createGain()
      master.gain.value = 0.5
      master.connect(ctx.destination)
      // Short decaying noise burst — the per-swap shutter click.
      const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.04), ctx.sampleRate)
      const data = noise.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2)
      }
      audioRef.current = { ctx, master, noise, hum: null }
      return audioRef.current
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    return () => {
      audioRef.current?.ctx.close().catch(() => {})
    }
  }, [])

  // ── the cut ────────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    const overlay = overlayRef.current
    const target = firstCardRef.current
    if (!overlay || !frames || !target || frames.length === 0) return

    cancelAnimationFrame(rafRef.current)
    window.clearTimeout(doneTimerRef.current)
    setPhase('cut')

    // Audio must be (re)created inside a play() call — replays and toggles
    // are user gestures, which is what unlocks the AudioContext. On the
    // auto-play resume() fails silently and the cut just runs mute.
    const rig = fx.sound ? ensureAudio() : null
    rig?.ctx.resume().catch(() => {})
    const stopHum = () => {
      if (!rig?.hum) return
      const t0 = rig.ctx.currentTime
      rig.hum.gain.gain.setTargetAtTime(0.0001, t0, 0.03)
      rig.hum.osc.stop(t0 + 0.25)
      rig.hum = null
    }
    const startHum = () => {
      if (!rig || rig.hum) return
      const osc = rig.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 55
      const filt = rig.ctx.createBiquadFilter()
      filt.type = 'lowpass'
      filt.frequency.value = 140
      const gain = rig.ctx.createGain()
      const t0 = rig.ctx.currentTime
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.15)
      osc.connect(filt)
      filt.connect(gain)
      gain.connect(rig.master)
      osc.start()
      rig.hum = { osc, gain }
    }
    const playClick = (seed: number) => {
      if (!rig || rig.ctx.state !== 'running') return
      const src = rig.ctx.createBufferSource()
      src.buffer = rig.noise
      src.playbackRate.value = 0.7 + rand(seed, 8) * 0.6
      const gain = rig.ctx.createGain()
      const t0 = rig.ctx.currentTime
      gain.gain.setValueAtTime(0.25, t0)
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.03)
      src.connect(gain)
      gain.connect(rig.master)
      src.start()
    }
    stopHum()

    // FLIP setup: park the overlay exactly on the first card, then transform
    // it back out to the centered 80% rect and animate to identity.
    const rect = target.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let startW = vw * START_COVER
    let startH = (startW * 9) / 16
    if (startH > vh * START_COVER) {
      startH = vh * START_COVER
      startW = (startH * 16) / 9
    }
    const scale0 = startW / rect.width
    const dx0 = vw / 2 - (rect.left + rect.width / 2)
    const dy0 = vh / 2 - (rect.top + rect.height / 2)

    overlay.style.left = `${rect.left}px`
    overlay.style.top = `${rect.top}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
    overlay.style.filter = 'none'
    overlay.style.boxShadow = 'none'
    // The rectangle starts razor-sharp (a full-bleed screen, not a card) and
    // morphs into the card's 12px radius as it lands.
    overlay.style.borderRadius = '0px'

    frameEls.current.forEach((el) => {
      if (el) el.style.visibility = 'hidden'
    })
    if (bloomRef.current) bloomRef.current.style.opacity = '0'

    // Dwell schedule: one entry per flash (frame index + duration). Dwells
    // are fractional ms — the walker below advances by elapsed time, so no
    // tick-grid rounding is needed; the ≥1-tick clamp just guarantees every
    // frame paints at least once at 60Hz.
    const N = frames.length
    const entries: { frame: number; dur: number }[] = []
    for (let i = 0; i < N; i++) {
      const u = N > 1 ? i / (N - 1) : 1
      const ticks = fx.ramp ? lerp(RAMP_START, RAMP_END, u) : FRAMES_PER_IMAGE
      entries.push({ frame: i, dur: Math.max(1, ticks * CUT_SCALE) * TICK_MS })
    }
    const cum: number[] = [0]
    for (const e of entries) cum.push(cum[cum.length - 1] + e.dur)
    const duration = cum[cum.length - 1]
    const crtMs = fx.crtOn ? CRT_ON_MS : 0

    let entryShown = -1
    let frameShown = -1
    let landedFlag = false
    let humStarted = false
    let start = performance.now()
    let lastTick = start

    const showFrame = (f: number) => {
      const els = frameEls.current
      if (frameShown >= 0 && els[frameShown]) els[frameShown]!.style.visibility = 'hidden'
      if (f >= 0 && els[f]) els[f]!.style.visibility = 'visible'
      frameShown = f
    }

    const tick = (now: number) => {
      // RAF pauses in hidden tabs — a big gap between ticks means the tab was
      // backgrounded. Shift the clock forward so the cut resumes where it
      // paused instead of skipping straight to the landing.
      if (now - lastTick > 500) start += now - lastTick
      lastTick = now
      const t = now - start

      // CRT power-on pre-roll: the first frame collapses to a bright
      // horizontal line that expands vertically while a white bloom decays.
      // The FLIP holds at the start rect until the screen is "on".
      if (t < crtMs) {
        const u = easeOutCubic(clamp01(t / crtMs))
        overlay.style.transform = `translate(${dx0}px, ${dy0}px) scale(${scale0}) scaleY(${lerp(0.006, 1, u).toFixed(4)})`
        overlay.style.filter = `brightness(${lerp(5, 1, u).toFixed(3)})`
        // The tube glows cool white while it warms up.
        overlay.style.boxShadow = `0 0 120px 40px rgba(200, 220, 255, ${(0.5 * (1 - u)).toFixed(3)})`
        if (frameShown !== 0) showFrame(0)
        if (bloomRef.current) bloomRef.current.style.opacity = Math.pow(1 - u, 1.5).toFixed(3)
        if (fx.sound && !humStarted) {
          humStarted = true
          startHum()
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const tc = t - crtMs // schedule clock

      if (tc < duration) {
        // Transform every RAF tick (smooth on high-Hz displays); the frame
        // index walks the schedule off the same clock, so the last frame and
        // the landing coincide.
        const p = easeInOutCubic(clamp01(tc / duration))
        const s = lerp(scale0, 1, p)
        overlay.style.transform = `translate(${lerp(dx0, 0, p)}px, ${lerp(dy0, 0, p)}px) scale(${s})`
        // Corner morph, scale-compensated: the FLIP scale multiplies any CSS
        // radius visually, so divide it back out — the on-screen radius is an
        // exact 0 → 12px ease regardless of the rectangle's current size.
        overlay.style.borderRadius = `${((12 * p) / s).toFixed(2)}px`

        let e = entryShown < 0 ? 0 : entryShown
        while (e < entries.length - 1 && tc >= cum[e + 1]) e++
        if (e !== entryShown) {
          entryShown = e
          showFrame(entries[e].frame)
          if (bloomRef.current) bloomRef.current.style.opacity = '0'
          overlay.style.filter = 'none'
          overlay.style.boxShadow = 'none'
          if (fx.sound) {
            if (!humStarted) {
              humStarted = true
              startHum()
            }
            playClick(e)
          }
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (!landedFlag) {
        landedFlag = true
        // Clock jumps (backgrounded tab) can skip schedule entries — force
        // the landing frame so the card never resolves showing the wrong one.
        if (frameShown !== N - 1) showFrame(N - 1)
        overlay.style.filter = 'none'
        overlay.style.boxShadow = 'none'
        overlay.style.borderRadius = '12px' // pin the card radius exactly
        overlay.style.transform = 'none'
        stopHum()
        setPhase('landed')
        // Once the grid has settled, drop the overlay — the real first card
        // underneath shows the identical thumbnail, so the swap is invisible.
        doneTimerRef.current = window.setTimeout(() => setPhase('done'), 600)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [frames, fx, ensureAudio])

  // Auto-start when frames are ready — and auto-replay whenever the effect
  // mix changes, so the panel is a one-click A/B.
  useEffect(() => {
    if (!frames) return
    // Don't burn the one-shot intro on a hidden tab (RAF is paused there
    // anyway) — hold until the tab is actually visible, then start.
    let started = false
    const startWhenVisible = () => {
      if (started || document.visibilityState !== 'visible') return
      started = true
      document.removeEventListener('visibilitychange', startWhenVisible)
      play()
    }
    startWhenVisible()
    document.addEventListener('visibilitychange', startWhenVisible)
    return () => {
      document.removeEventListener('visibilitychange', startWhenVisible)
      cancelAnimationFrame(rafRef.current)
      window.clearTimeout(doneTimerRef.current)
    }
  }, [frames, play])

  const landed = phase === 'landed' || phase === 'done'

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0a0a] text-white">
      {/* Header mark lands with the grid */}
      <motion.div
        className="absolute left-1/2 z-30 -translate-x-1/2"
        style={{ top: 52 }}
        initial={false}
        animate={landed ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: landed ? 0.5 : 0.15, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="h-11 w-11 -translate-y-1/2">
          <Mark />
        </div>
      </motion.div>

      {/* The homepage — laid out from the start (the overlay needs the first
          card's real geometry to aim at), revealed once the cut lands. */}
      <div className="flex h-full flex-col items-center justify-center px-6">
        <motion.p
          className="mb-10 text-sm uppercase tracking-[0.2em] text-white/40"
          initial={false}
          animate={landed ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: landed ? 0.5 : 0.15, ease: [0.23, 1, 0.32, 1] }}
        >
          Launch videos, curated
        </motion.p>
        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-3">
          {CARDS.map((v, i) =>
            i === 0 ? (
              // The landing slot: no entrance of its own — the overlay IS its
              // entrance. It flips visible the instant the overlay lands
              // (which covers it pixel-for-pixel), so there is no flash.
              <div
                key={v.id}
                ref={firstCardRef}
                className="aspect-video w-full overflow-hidden rounded-xl ring-1 ring-white/[0.06]"
                style={{ opacity: landed ? 1 : 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" />
              </div>
            ) : (
              <motion.div
                key={v.id}
                className="aspect-video w-full overflow-hidden rounded-xl ring-1 ring-white/[0.06]"
                initial={false}
                animate={
                  landed
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 14, scale: 0.97 }
                }
                transition={{
                  duration: landed ? 0.45 : 0.15,
                  delay: landed ? i * GRID_STAGGER : 0,
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" />
              </motion.div>
            ),
          )}
        </div>
      </div>

      {/* The supercut rectangle — parked on the first card's rect, FLIPped out
          to 80% of the viewport, flashing catalog frames per the dwell
          schedule while it shrinks home. */}
      <div
        ref={overlayRef}
        className="fixed z-20 overflow-hidden bg-[#0a0a0a] ring-1 ring-white/[0.06]"
        style={{
          opacity: phase === 'cut' || phase === 'landed' ? 1 : 0,
          // Fade only on the way out — replay must snap back on instantly.
          transition: phase === 'done' ? 'opacity 0.25s ease-out' : 'none',
          transformOrigin: 'center',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      >
        {(frames ?? []).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            ref={(el) => {
              frameEls.current[i] = el
            }}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden' }}
          />
        ))}
        {/* Halftone screen over the cut — a printed-dot texture riding the
            flashes. It scales with the FLIP transform, so the dots start
            chunky at 80% cover and refine as the rectangle shrinks, then
            dissolve on landing so the card resolves clean. */}
        {fx.halftone && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: 2,
              backgroundImage:
                'radial-gradient(circle, rgba(0,0,0,0.45) 0.15px, transparent 0.25px)',
              backgroundSize: '0.5px 0.5px',
              opacity: phase === 'cut' ? 1 : 0,
              transition: phase === 'cut' ? 'none' : 'opacity 0.35s ease-out',
            }}
          />
        )}
        {/* CRT power-on bloom — opacity driven in the RAF pre-roll */}
        {fx.crtOn && (
          <div
            ref={bloomRef}
            className="absolute inset-0 bg-white"
            style={{ zIndex: 3, opacity: 0 }}
          />
        )}
      </div>

      {/* Loading pulse while the catalog frames decode */}
      {phase === 'loading' && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />
        </div>
      )}

      {/* Effects panel — flipping any toggle replays the cut with that mix */}
      <div className="absolute bottom-6 right-6 z-40 w-44 rounded-xl bg-white/[0.06] p-3 text-xs text-white/70 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-medium text-white/90">Effects</span>
          <div className="flex gap-2">
            <button
              className="text-white/50 transition-colors hover:text-white"
              onClick={() => setFx(withAll(true))}
            >
              all
            </button>
            <button
              className="text-white/50 transition-colors hover:text-white"
              onClick={() => setFx(withAll(false))}
            >
              none
            </button>
          </div>
        </div>
        {FX_DEFS.map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between py-0.5 transition-colors hover:text-white"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              className="accent-white"
              checked={fx[key]}
              onChange={(e) => setFx((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
          </label>
        ))}
      </div>

      {/* Replay */}
      <button
        onClick={play}
        disabled={!frames}
        className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/15 disabled:opacity-40"
      >
        Replay supercut
      </button>
    </div>
  )
}

function Mark() {
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
