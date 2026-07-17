'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { videos } from '@/data/videos'
import { useIntroContext } from '@/context/intro-context'
import { sizedThumbnail } from '@/lib/utils'
import { trackGoal, GOALS } from '@/lib/analytics'

/**
 * SupercutIntro — the homepage intro (replaces IntroAnimation in
 * HomePageWrapper; the eye animation is kept in intro-animation.tsx and the
 * design iterations live on the /supercut sandbox route).
 *
 * A rectangle covering ~80% of the viewport CRT-powers-on and plays a
 * supercut of the entire catalog — one frame per launch video, speed-ramped
 * from ~3.5 ticks per frame down to 1 — while shrinking in one continuous
 * move into the real first video card of the grid, corners morphing from
 * razor-sharp to the card's 6px radius. The cut runs oldest → newest, so the
 * final frame IS the first card's thumbnail: the rectangle lands and simply
 * is the card. The intro then flips the shared intro phase to 'settling',
 * which is what the header logo and the staggered grid reveal already key
 * off — and fades itself out over the live card.
 *
 * Contracts carried over from the eye intro:
 *   - The page mounts behind this opaque overlay from the start, so previews
 *     load while the cut plays; the cut doesn't start until the above-fold
 *     previews have painted (mediaReady) or MEDIA_WAIT_CAP_MS passes —
 *     a slow network must never trap the visitor on the intro.
 *   - onContentReady fires at the settling reveal, onComplete at done
 *     (which marks the intro as seen for the session).
 *   - GOALS.introCompleted is tracked with waited_for_media, keeping the
 *     analytics funnel comparable across intro variants.
 *
 * Mechanics (distilled from the /supercut sandbox):
 *   - Frames preload via fetch → blob → object URL behind one global
 *     deadline; failures just shorten the cut. The landing frame is always
 *     kept last, falling back to its remote URL.
 *   - FLIP: the rectangle is laid out on the measured card rect and animated
 *     from a translate+scale start transform to identity. The target rect is
 *     re-measured every tick so a scroll during the cut can't make the
 *     rectangle land beside the card.
 *   - The intro also waits for the tab to be visible before starting — RAF
 *     is paused in hidden tabs and the one-shot intro shouldn't burn there.
 *   - Projector audio (click per swap + hum) is attempted but will stay
 *     silent on a true first visit: browsers keep AudioContext suspended
 *     until a user gesture. It comes alive if the visitor has interacted.
 */

interface SupercutIntroProps {
  onComplete?: () => void
  onContentReady?: () => void
}

// ── timing ───────────────────────────────────────────────────────────────────
const TICK_MS = 1000 / 60
// Speed ramp: dwell per frame eases from RAMP_START ticks down to RAMP_END,
// scaled by CUT_SCALE and clamped to ≥1 tick so no frame is skipped at 60Hz.
const RAMP_START = 5
const RAMP_END = 1
const CUT_SCALE = 0.7
const CRT_ON_MS = 240
const START_COVER = 0.8
const CARD_RADIUS = 6 // VideoCard's collapsed borderRadius
const MEDIA_WAIT_CAP_MS = 2500
const PRELOAD_DEADLINE_MS = 20000

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Deterministic per-index noise so every run sounds identical.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Newest first — identical to the homepage sort, so ITEMS[0] is the video in
// the grid's first card (the landing target).
const ITEMS = videos
  .filter((v) => v.thumbnailUrl)
  .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))

// Chronological cut (oldest → newest): the sequence crescendos into the
// newest video, which is exactly the card the rectangle lands on.
const FLASH_SRCS = [...ITEMS.slice(1)]
  .reverse()
  .map((v) => sizedThumbnail(v.thumbnailUrl!, 1280))
  .concat(sizedThumbnail(ITEMS[0].thumbnailUrl!, 1280))

type Phase = 'waiting' | 'cut' | 'landed' | 'done' | 'gone'

type AudioRig = {
  ctx: AudioContext
  master: GainNode
  noise: AudioBuffer
  hum: { osc: OscillatorNode; gain: GainNode } | null
}

export function SupercutIntro({ onComplete, onContentReady }: SupercutIntroProps) {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  // Flips when the above-fold previews painted, or after the wait cap.
  const [capElapsed, setCapElapsed] = useState(false)
  const { setIntroPhase, mediaReady } = useIntroContext()

  const overlayRef = useRef<HTMLDivElement>(null)
  const bloomRef = useRef<HTMLDivElement>(null)
  const frameEls = useRef<(HTMLImageElement | null)[]>([])
  const objectUrlsRef = useRef<string[]>([])
  const audioRef = useRef<AudioRig | null>(null)
  const startedRef = useRef(false)
  const rafRef = useRef(0)
  const timersRef = useRef<number[]>([])

  // Callbacks in refs — the timeline outlives any single render.
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onContentReadyRef = useRef(onContentReady)
  onContentReadyRef.current = onContentReady
  const mediaReadyRef = useRef(mediaReady)
  mediaReadyRef.current = mediaReady

  useEffect(() => {
    const cap = window.setTimeout(() => setCapElapsed(true), MEDIA_WAIT_CAP_MS)
    return () => window.clearTimeout(cap)
  }, [])

  // ── preload every frame ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    // fetch → blob → object URL, NOT new Image(): Chrome stalls <img> loads
    // completely in hidden tabs, while fetch() runs at full speed. Blob URLs
    // also guarantee the stacked flash <img>s can never refetch mid-cut.
    const load = async (src: string): Promise<string | null> => {
      try {
        const res = await fetch(src)
        if (!res.ok) return null
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        objectUrlsRef.current.push(url)
        return url
      } catch {
        return null
      }
    }
    const results: (string | null)[] = new Array<string | null>(FLASH_SRCS.length).fill(null)
    const all = Promise.all(FLASH_SRCS.map((s, i) => load(s).then((u) => void (results[i] = u))))
    const deadline = new Promise<void>((resolve) =>
      window.setTimeout(resolve, PRELOAD_DEADLINE_MS),
    )
    Promise.race([all, deadline]).then(() => {
      if (!alive) return
      const landingIdx = FLASH_SRCS.length - 1
      // The landing frame is always kept last (falling back to the remote
      // URL) — without it the rectangle would land showing the wrong video.
      const landing = results[landingIdx] ?? FLASH_SRCS[landingIdx]
      const ok = results.slice(0, landingIdx).filter((u): u is string => u !== null)
      setFrames([...ok, landing])
    })
    return () => {
      alive = false
    }
  }, [])

  const cleanupUrls = useCallback(() => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    objectUrlsRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      cleanupUrls()
      cancelAnimationFrame(rafRef.current)
      timersRef.current.forEach((t) => window.clearTimeout(t))
      audioRef.current?.ctx.close().catch(() => {})
    }
  }, [cleanupUrls])

  // ── the cut ────────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    if (startedRef.current || !frames || frames.length === 0) return
    const overlay = overlayRef.current
    if (!overlay) return

    const finish = (landed: boolean) => {
      setPhase('landed')
      setIntroPhase('settling')
      onContentReadyRef.current?.()
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('done')
          setIntroPhase('done')
          trackGoal(GOALS.introCompleted, {
            waited_for_media: mediaReadyRef.current ? 'false' : 'true',
            variant: landed ? 'supercut' : 'supercut_fallback',
          })
          onCompleteRef.current?.()
        }, 600),
      )
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('gone')
          cleanupUrls() // ~48 decoded blobs have no business outliving the intro
        }, 950),
      )
    }

    const target = document.querySelector<HTMLElement>('[data-supercut-target]')
    if (!target) {
      // No grid card to land on (empty catalog?) — never trap the visitor:
      // skip the spectacle and reveal the page.
      startedRef.current = true
      finish(false)
      return
    }
    startedRef.current = true
    setPhase('cut')

    // Audio will stay suspended without a prior user gesture — that's fine,
    // the cut just runs mute.
    const rig = ensureAudio(audioRef)
    rig?.ctx.resume().catch(() => {})
    const stopHum = () => {
      if (!rig?.hum) return
      const t0 = rig.ctx.currentTime
      rig.hum.gain.gain.setTargetAtTime(0.0001, t0, 0.03)
      rig.hum.osc.stop(t0 + 0.25)
      rig.hum = null
    }

    // Start rect: centered, covering START_COVER of the viewport at 16:9.
    const vw = window.innerWidth
    const vh = window.innerHeight
    let startW = vw * START_COVER
    let startH = (startW * 9) / 16
    if (startH > vh * START_COVER) {
      startH = vh * START_COVER
      startW = (startH * 16) / 9
    }

    // Dwell schedule — fractional ms dwells, clamped to ≥1 tick.
    const N = frames.length
    const entries: { frame: number; dur: number }[] = []
    for (let i = 0; i < N; i++) {
      const u = N > 1 ? i / (N - 1) : 1
      const ticks = lerp(RAMP_START, RAMP_END, u)
      entries.push({ frame: i, dur: Math.max(1, ticks * CUT_SCALE) * TICK_MS })
    }
    const cum: number[] = [0]
    for (const e of entries) cum.push(cum[cum.length - 1] + e.dur)
    const duration = cum[cum.length - 1]

    let entryShown = -1
    let frameShown = -1
    let landedFlag = false
    let humStarted = false
    let lastRect = { left: 0, top: 0, width: 0, height: 0 }
    let start = performance.now()
    let lastTick = start

    const showFrame = (f: number) => {
      const els = frameEls.current
      if (frameShown >= 0 && els[frameShown]) els[frameShown]!.style.visibility = 'hidden'
      if (f >= 0 && els[f]) els[f]!.style.visibility = 'visible'
      frameShown = f
    }

    // Re-measure the landing card every tick: it's nearly free, and a scroll
    // or resize mid-cut would otherwise land the rectangle beside the card.
    // Style writes only happen when the rect actually moved.
    const measure = () => {
      const r = target.getBoundingClientRect()
      if (
        r.left !== lastRect.left ||
        r.top !== lastRect.top ||
        r.width !== lastRect.width ||
        r.height !== lastRect.height
      ) {
        lastRect = { left: r.left, top: r.top, width: r.width, height: r.height }
        overlay.style.left = `${r.left}px`
        overlay.style.top = `${r.top}px`
        overlay.style.width = `${r.width}px`
        overlay.style.height = `${r.height}px`
      }
      return lastRect
    }

    overlay.style.borderRadius = '0px'
    frameEls.current.forEach((el) => {
      if (el) el.style.visibility = 'hidden'
    })

    const tick = (now: number) => {
      // RAF pauses in hidden tabs — shift the clock over big gaps so the cut
      // resumes where it paused instead of skipping straight to the landing.
      if (now - lastTick > 500) start += now - lastTick
      lastTick = now
      const t = now - start

      const rect = measure()
      const scale0 = startW / rect.width
      const dx0 = window.innerWidth / 2 - (rect.left + rect.width / 2)
      const dy0 = window.innerHeight / 2 - (rect.top + rect.height / 2)

      // CRT power-on pre-roll: the first frame collapses to a bright
      // horizontal line that expands vertically while a white bloom decays.
      if (t < CRT_ON_MS) {
        const u = easeOutCubic(clamp01(t / CRT_ON_MS))
        overlay.style.transform = `translate(${dx0}px, ${dy0}px) scale(${scale0}) scaleY(${lerp(0.006, 1, u).toFixed(4)})`
        overlay.style.filter = `brightness(${lerp(5, 1, u).toFixed(3)})`
        // The tube glows cool white while it warms up.
        overlay.style.boxShadow = `0 0 120px 40px rgba(200, 220, 255, ${(0.5 * (1 - u)).toFixed(3)})`
        if (frameShown !== 0) showFrame(0)
        if (bloomRef.current) bloomRef.current.style.opacity = Math.pow(1 - u, 1.5).toFixed(3)
        if (rig && !humStarted) {
          humStarted = true
          startHum(rig)
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const tc = t - CRT_ON_MS // schedule clock

      if (tc < duration) {
        const p = easeInOutCubic(clamp01(tc / duration))
        const s = lerp(scale0, 1, p)
        overlay.style.transform = `translate(${lerp(dx0, 0, p)}px, ${lerp(dy0, 0, p)}px) scale(${s})`
        // Corner morph, scale-compensated: the on-screen radius is an exact
        // 0 → CARD_RADIUS ease regardless of the rectangle's current size.
        overlay.style.borderRadius = `${((CARD_RADIUS * p) / s).toFixed(2)}px`

        let e = entryShown < 0 ? 0 : entryShown
        while (e < entries.length - 1 && tc >= cum[e + 1]) e++
        if (e !== entryShown) {
          entryShown = e
          showFrame(entries[e].frame)
          if (bloomRef.current) bloomRef.current.style.opacity = '0'
          overlay.style.filter = 'none'
          overlay.style.boxShadow = 'none'
          if (rig) {
            if (!humStarted) {
              humStarted = true
              startHum(rig)
            }
            playClick(rig, e)
          }
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (!landedFlag) {
        landedFlag = true
        // Clock jumps can skip schedule entries — force the landing frame so
        // the card never resolves showing the wrong one.
        if (frameShown !== N - 1) showFrame(N - 1)
        overlay.style.filter = 'none'
        overlay.style.boxShadow = 'none'
        overlay.style.borderRadius = `${CARD_RADIUS}px`
        overlay.style.transform = 'none'
        stopHum()
        finish(true)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [frames, setIntroPhase, cleanupUrls])

  // Start once: frames preloaded, previews painted (or cap), tab visible.
  useEffect(() => {
    if (!frames || startedRef.current) return
    if (!mediaReady && !capElapsed) return
    const startWhenVisible = () => {
      if (startedRef.current || document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', startWhenVisible)
      play()
    }
    startWhenVisible()
    document.addEventListener('visibilitychange', startWhenVisible)
    return () => document.removeEventListener('visibilitychange', startWhenVisible)
  }, [frames, mediaReady, capElapsed, play])

  if (phase === 'gone') return null

  const settling = phase === 'landed' || phase === 'done'

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Opaque cover — the page loads behind it; fades at the settling
          reveal exactly like the eye intro's backdrop. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: settling ? 'rgba(10, 10, 10, 0)' : 'rgba(10, 10, 10, 1)',
          transition: 'background-color 0.5s ease-out',
        }}
      />

      {/* The supercut rectangle — laid out on the landing card's rect,
          FLIPped out to 80% of the viewport. After landing it holds over the
          card, then fades so the live preview underneath takes over. */}
      <div
        ref={overlayRef}
        className="fixed z-10 overflow-hidden bg-[#0a0a0a]"
        style={{
          opacity: phase === 'cut' || phase === 'landed' ? 1 : 0,
          transition: phase === 'done' ? 'opacity 0.3s ease-out' : 'none',
          transformOrigin: 'center',
          willChange: 'transform',
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
        {/* Halftone screen — dot texture riding the flashes; it scales with
            the FLIP transform and dissolves as the rectangle lands. */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 2,
            backgroundImage:
              'radial-gradient(circle, rgba(0,0,0,0.65) 0.15px, transparent 0.25px)',
            backgroundSize: '0.5px 0.5px',
            opacity: phase === 'cut' ? 1 : 0,
            transition: phase === 'cut' ? 'none' : 'opacity 0.35s ease-out',
          }}
        />
        {/* CRT power-on bloom — opacity driven in the RAF pre-roll */}
        <div ref={bloomRef} className="absolute inset-0 bg-white" style={{ zIndex: 3, opacity: 0 }} />
      </div>
    </div>
  )
}

// ── projector audio helpers ──────────────────────────────────────────────────

function ensureAudio(ref: React.MutableRefObject<AudioRig | null>): AudioRig | null {
  if (ref.current) return ref.current
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
    ref.current = { ctx, master, noise, hum: null }
    return ref.current
  } catch {
    return null
  }
}

function startHum(rig: AudioRig) {
  if (rig.hum) return
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

function playClick(rig: AudioRig, seed: number) {
  if (rig.ctx.state !== 'running') return
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
