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
 * A rectangle covering ~80% of the viewport plays a supercut of the entire
 * catalog — one frame per launch video, speed-ramped from ~3.5 ticks per
 * frame down to 1 — while shrinking, centered, toward a 2×2 mosaic. When
 * the cut ends the rectangle SPLITS into four card-sized pieces (its own
 * quadrants — 16:9 like the cards, so nothing stretches), each showing its
 * destination video, and the pieces fall one after another into the first
 * four grid slots, corners already at the cards' 6px radius. Each piece
 * live-mirrors its card's playing preview (static thumbnail fallback), so
 * the pieces land, hold, and fade into cards that are already playing.
 *
 * On layouts where the first four cards aren't all on screen (single-column
 * mobile), the split is skipped and the rectangle flies to the first card
 * alone — the original single-landing behavior. The grid learns which cards
 * to hold back via introTargetCount on the intro context.
 *
 * The shared intro phase flips to 'settling' mid-flight (REVEAL_AT of the
 * cut), so the backdrop fades and the header logo and staggered grid
 * assemble UNDER the still-flying rectangle; the pieces then fade out over
 * the live cards after landing.
 *
 * Contracts carried over from the eye intro:
 *   - The page mounts behind this opaque overlay from the start, so previews
 *     load while the cut plays. There is NO wait on mediaReady before
 *     starting — the reveal degrades gracefully (cards show static
 *     thumbnails until their previews paint); mediaReady only feeds the
 *     analytics dimension.
 *   - onContentReady fires at the settling reveal, onComplete at done
 *     (which marks the intro as seen for the session).
 *   - GOALS.introCompleted is tracked with waited_for_media, keeping the
 *     analytics funnel comparable across intro variants.
 *
 * Mechanics:
 *   - Frames preload via fetch → blob → object URL behind one global
 *     deadline; failures just shorten the cut (Chrome stalls <img> loads in
 *     hidden tabs; fetch runs at full speed).
 *   - FLIP throughout: the big rectangle is laid out on the mosaic rect
 *     (screen-space, so it needs no re-measuring); each piece is laid out
 *     on its card's rect — re-measured every tick so a scroll mid-fall
 *     can't make a piece land beside its card.
 *   - The intro waits for the tab to be visible before starting — RAF is
 *     paused in hidden tabs and the one-shot intro shouldn't burn there.
 *   - Projector audio (click per swap, a thunk per piece landing, hum) is
 *     attempted but stays silent on a true first visit: browsers keep
 *     AudioContext suspended until a user gesture.
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
const START_COVER = 0.8
const CARD_RADIUS = 6 // VideoCard's collapsed borderRadius
// The split: piece flight time and the per-piece launch stagger ("fall into
// place" one after another).
const FALL_MS = 550
const PIECE_STAGGER_MS = 70
// How far through the cut (0..1) the page reveal starts: the backdrop fades
// and the grid staggers in UNDER the still-flying rectangle. The landing
// cards themselves stay hidden until the pieces start fading over them.
const REVEAL_AT = 0.55
const PRELOAD_DEADLINE_MS = 20000

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Deterministic per-index noise so every run sounds identical.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Newest first — identical to the homepage sort, so ITEMS[0..3] are the
// videos in the grid's first four cards (the landing targets).
const ITEMS = videos
  .filter((v) => v.thumbnailUrl)
  .sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))

// Chronological cut (oldest → newest): the sequence crescendos into the
// newest videos — exactly the cards the pieces land on.
// 640px, not 1280: each frame flashes for a few ticks under the halftone
// screen, so the resolution is invisible — and 640 is the exact variant the
// grid cards request, so the Mux CDN always has it hot.
const FLASH_SRCS = [...ITEMS.slice(1)]
  .reverse()
  .map((v) => sizedThumbnail(v.thumbnailUrl!, 640))
  .concat(sizedThumbnail(ITEMS[0].thumbnailUrl!, 640))

const PIECE_COUNT = 4

type Phase = 'waiting' | 'cut' | 'landed' | 'done' | 'gone'

type Rect = { left: number; top: number; width: number; height: number }

type AudioRig = {
  ctx: AudioContext
  master: GainNode
  noise: AudioBuffer
  hum: { osc: OscillatorNode; gain: GainNode } | null
}

export function SupercutIntro({ onComplete, onContentReady }: SupercutIntroProps) {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  // True once the mid-flight reveal has fired — drives the backdrop fade
  // independently of `phase` (halftone dissolve etc. still key off landing).
  const [revealedEarly, setRevealedEarly] = useState(false)
  const { setIntroPhase, setIntroTargetCount, mediaReady } = useIntroContext()

  const overlayRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLCanvasElement>(null)
  const frameEls = useRef<(HTMLImageElement | null)[]>([])
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([])
  const pieceImgRefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const objectUrlsRef = useRef<string[]>([])
  // remote frame URL → local blob URL, for giving pieces their frames.
  const blobBySrcRef = useRef<Map<string, string>>(new Map())
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
        blobBySrcRef.current.set(src, url)
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
    blobBySrcRef.current.clear()
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

    // The page reveal: backdrop fade + grid stagger + header logo, all keyed
    // off the shared 'settling' phase. Fired mid-flight (REVEAL_AT) for the
    // overlap; idempotent so the landing/fallback path can call it safely.
    let revealed = false
    const reveal = () => {
      if (revealed) return
      revealed = true
      setRevealedEarly(true)
      setIntroPhase('settling')
      onContentReadyRef.current?.()
    }

    const finish = (variant: string) => {
      reveal()
      setPhase('landed')
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('done')
          setIntroPhase('done')
          trackGoal(GOALS.introCompleted, {
            waited_for_media: mediaReadyRef.current ? 'false' : 'true',
            variant,
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

    // Landing targets: the first (up to four) grid cards, marked and index-
    // stamped by VideoGrid.
    const targets = [...document.querySelectorAll<HTMLElement>('[data-supercut-target]')]
      .sort(
        (a, b) =>
          Number(a.dataset.supercutTarget ?? 99) - Number(b.dataset.supercutTarget ?? 99),
      )
      .slice(0, PIECE_COUNT)
    if (targets.length === 0) {
      // No grid card to land on (empty catalog?) — never trap the visitor:
      // skip the spectacle and reveal the page.
      startedRef.current = true
      setIntroTargetCount(0)
      finish('supercut_fallback')
      return
    }
    startedRef.current = true

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Split only when all four cards are (mostly) on screen — on a
    // single-column phone the lower cards sit below the fold and pieces
    // would fly off-screen; there the rectangle lands on card one alone.
    const targetRects = targets.map((el) => el.getBoundingClientRect())
    const splitMode =
      targets.length === PIECE_COUNT &&
      targetRects.every((r) => r.width > 0 && r.top >= 0 && r.top + r.height * 0.6 <= vh)
    setIntroTargetCount(splitMode ? PIECE_COUNT : 1)
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
    let startW = vw * START_COVER
    let startH = (startW * 9) / 16
    if (startH > vh * START_COVER) {
      startH = vh * START_COVER
      startW = (startH * 16) / 9
    }

    // The big rectangle's destination:
    //  - split: a screen-fixed 2×2 mosaic rect, centered like the start rect,
    //    sized so each quadrant ≈ one card (plus the grid gap baked in, so
    //    the gaps appear as the pieces separate). Screen-fixed → no
    //    re-measuring during the cut.
    //  - single: the first card's rect (re-measured every tick, as before).
    const r0 = targetRects[0]
    let mosaic: Rect | null = null
    let quadOrder: number[] = [0, 1, 2, 3] // quadrant index (TL,TR,BL,BR) per card
    if (splitMode) {
      const sameRow = (a: DOMRect, b: DOMRect) => Math.abs(a.top - b.top) < 2
      const r1 = targetRects[1]
      const gapX = sameRow(r0, r1) ? Math.max(0, r1.left - (r0.left + r0.width)) : 16
      const below = targetRects.find((r) => r.top > r0.top + 2)
      const gapY = below ? Math.max(0, below.top - (r0.top + r0.height)) : gapX
      const w = 2 * r0.width + gapX
      const h = 2 * r0.height + gapY
      mosaic = { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h }
      // Quadrants are handed to cards so paths don't cross: when all four
      // cards sit in one row, columns of the mosaic map to card order
      // (TL,BL,TR,BR → cards 0..3); in a 2×2 grid it's the natural reading
      // order.
      const oneRow = targetRects.every((r) => sameRow(r, r0))
      quadOrder = oneRow ? [0, 2, 1, 3] : [0, 1, 2, 3]
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
    const fallEnd = splitMode
      ? duration + (PIECE_COUNT - 1) * PIECE_STAGGER_MS + FALL_MS
      : duration

    let entryShown = -1
    let frameShown = -1
    let splitDone = false
    let landedFlag = false
    let landedAt = 0
    let humStarted = false
    let lastRect: Rect = { left: 0, top: 0, width: 0, height: 0 }
    const pieceRects: Rect[] = targetRects.map((r) => ({
      left: 0,
      top: 0,
      width: r.width,
      height: r.height,
    }))
    const pieceLanded: boolean[] = [false, false, false, false]
    let start = performance.now()
    let lastTick = start

    const showFrame = (f: number) => {
      const els = frameEls.current
      if (frameShown >= 0 && els[frameShown]) els[frameShown]!.style.visibility = 'hidden'
      if (f >= 0 && els[f]) els[f]!.style.visibility = 'visible'
      frameShown = f
    }

    // Live mirrors: canvases that copy a card's actual playing <video> via
    // drawImage, per frame, through the hold and fade — so the moment a
    // piece drops away there is zero discontinuity with the video under it.
    // Cross-origin video taints the canvas, but display-only use is fine —
    // we never read pixels back. Index 0..3 are the pieces; index 4 is the
    // single-mode big-rectangle mirror.
    const mirrors: ({ ctx: CanvasRenderingContext2D; video: HTMLVideoElement } | null)[] =
      [null, null, null, null, null]
    const drawMirror = (m: { ctx: CanvasRenderingContext2D; video: HTMLVideoElement }) => {
      const w = m.video.videoWidth
      const h = m.video.videoHeight
      if (!w || !h || m.video.readyState < 2) return false
      if (m.ctx.canvas.width !== w || m.ctx.canvas.height !== h) {
        m.ctx.canvas.width = w
        m.ctx.canvas.height = h
      }
      try {
        m.ctx.drawImage(m.video, 0, 0, w, h)
        return true
      } catch {
        return false
      }
    }
    const startMirrorOn = (
      slot: number,
      canvas: HTMLCanvasElement | null,
      host: HTMLElement,
    ): boolean => {
      if (mirrors[slot]) return true
      const video = host.querySelector('video')
      const ctx = canvas?.getContext('2d')
      if (!canvas || !video || !ctx) return false
      const m = { ctx, video }
      if (!drawMirror(m)) return false
      mirrors[slot] = m
      canvas.style.visibility = 'visible'
      return true
    }
    const drawAllMirrors = () => {
      for (const m of mirrors) if (m) drawMirror(m)
    }
    const anyMirror = () => mirrors.some(Boolean)

    // Re-measure a landing rect every tick: it's nearly free, and a scroll
    // or resize mid-flight would otherwise land things beside their cards.
    // Style writes only happen when the rect actually moved.
    const syncRect = (el: HTMLElement, node: HTMLElement, cache: Rect): Rect => {
      const r = el.getBoundingClientRect()
      if (
        r.left !== cache.left ||
        r.top !== cache.top ||
        r.width !== cache.width ||
        r.height !== cache.height
      ) {
        cache.left = r.left
        cache.top = r.top
        cache.width = r.width
        cache.height = r.height
        node.style.left = `${r.left}px`
        node.style.top = `${r.top}px`
        node.style.width = `${r.width}px`
        node.style.height = `${r.height}px`
      }
      return cache
    }

    // Hand off from the one big rectangle to the four pieces: each piece is
    // laid out on its card and FLIP-transformed back onto its quadrant of
    // the mosaic, showing its destination video (live mirror when the
    // preview is ready, blob thumbnail otherwise).
    const split = () => {
      splitDone = true
      overlay.style.visibility = 'hidden'
      for (let i = 0; i < PIECE_COUNT; i++) {
        const node = pieceRefs.current[i]
        if (!node || !mosaic) continue
        syncRect(targets[i], node, pieceRects[i])
        if (!startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])) {
          const img = pieceImgRefs.current[i]
          const remote = sizedThumbnail(ITEMS[i].thumbnailUrl!, 640)
          if (img) {
            img.src = blobBySrcRef.current.get(remote) ?? remote
            img.style.visibility = 'visible'
          }
        }
        node.style.visibility = 'visible'
      }
      if (rig) playClick(rig, 800) // the split itself is a cut too
    }

    const pieceTransform = (i: number, u: number) => {
      const node = pieceRefs.current[i]
      if (!node || !mosaic) return
      const c = syncRect(targets[i], node, pieceRects[i])
      const q = quadOrder[i] // 0 TL · 1 TR · 2 BL · 3 BR
      const qw = mosaic.width / 2
      const qh = mosaic.height / 2
      const qcx = mosaic.left + (q % 2) * qw + qw / 2
      const qcy = mosaic.top + Math.floor(q / 2) * qh + qh / 2
      const dx = qcx - (c.left + c.width / 2)
      const dy = qcy - (c.top + c.height / 2)
      const sx = qw / c.width
      const sy = qh / c.height
      const e = easeInOutCubic(u)
      node.style.transform = `translate(${(dx * (1 - e)).toFixed(2)}px, ${(dy * (1 - e)).toFixed(2)}px) scale(${lerp(sx, 1, e).toFixed(4)}, ${lerp(sy, 1, e).toFixed(4)})`
    }

    // Initial layout of the big rectangle.
    if (splitMode && mosaic) {
      overlay.style.left = `${mosaic.left}px`
      overlay.style.top = `${mosaic.top}px`
      overlay.style.width = `${mosaic.width}px`
      overlay.style.height = `${mosaic.height}px`
    }
    overlay.style.visibility = 'visible'
    overlay.style.borderRadius = '0px'
    frameEls.current.forEach((el) => {
      if (el) el.style.visibility = 'hidden'
    })
    if (mirrorRef.current) mirrorRef.current.style.visibility = 'hidden'
    pieceRefs.current.forEach((el) => {
      if (el) el.style.visibility = 'hidden'
    })

    const tick = (now: number) => {
      // RAF pauses in hidden tabs — shift the clock over big gaps so the cut
      // resumes where it paused instead of skipping straight to the landing.
      if (now - lastTick > 500) start += now - lastTick
      lastTick = now
      const tc = now - start // schedule clock

      // ── phase A: the cut on the big rectangle ──
      if (tc < duration) {
        let rect: Rect
        if (splitMode && mosaic) {
          rect = mosaic // screen-fixed — no measuring needed
        } else {
          rect = syncRect(targets[0], overlay, lastRect)
        }
        const scale0 = startW / rect.width
        const dx0 = vw / 2 - (rect.left + rect.width / 2)
        const dy0 = vh / 2 - (rect.top + rect.height / 2)
        const p = easeInOutCubic(clamp01(tc / duration))
        const s = lerp(scale0, 1, p)
        overlay.style.transform = `translate(${lerp(dx0, 0, p)}px, ${lerp(dy0, 0, p)}px) scale(${s})`
        // Corner morph, scale-compensated: the on-screen radius is an exact
        // 0 → CARD_RADIUS ease regardless of the rectangle's current size.
        overlay.style.borderRadius = `${((CARD_RADIUS * p) / s).toFixed(2)}px`

        // Mid-flight overlap: reveal the page under the flying rectangle.
        if (tc >= duration * REVEAL_AT) reveal()

        let e = entryShown < 0 ? 0 : entryShown
        while (e < entries.length - 1 && tc >= cum[e + 1]) e++
        if (e !== entryShown) {
          entryShown = e
          const f = entries[e].frame
          // Single mode: the final frame goes live — mirror the card's
          // playing preview if it has decodable frames. (In split mode the
          // pieces handle their own mirrors.)
          if (
            !splitMode &&
            f === N - 1 &&
            startMirrorOn(PIECE_COUNT, mirrorRef.current, targets[0])
          ) {
            showFrame(-1)
            frameShown = N - 1 // the canvas stands in for the landing still
          } else {
            showFrame(f)
          }
          if (rig) {
            if (!humStarted) {
              humStarted = true
              startHum(rig)
            }
            playClick(rig, e)
          }
        }
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── phase B: the split & fall (split mode only) ──
      if (splitMode && tc < fallEnd) {
        if (!splitDone) split()
        for (let i = 0; i < PIECE_COUNT; i++) {
          const u = clamp01((tc - duration - i * PIECE_STAGGER_MS) / FALL_MS)
          pieceTransform(i, u)
          if (u >= 1 && !pieceLanded[i]) {
            pieceLanded[i] = true
            if (rig) playClick(rig, 900 + i) // a thunk as each piece seats
            // Late mirror chance: the preview may have decoded during the
            // fall — upgrading at the seat means the hold shows live video.
            startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])
          }
        }
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (!landedFlag) {
        landedFlag = true
        landedAt = tc
        if (splitMode) {
          if (!splitDone) split() // clock-jump safety: never skip the handoff
          for (let i = 0; i < PIECE_COUNT; i++) {
            pieceTransform(i, 1)
            if (!pieceLanded[i]) {
              pieceLanded[i] = true
              startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])
            }
          }
        } else {
          // Clock jumps can skip schedule entries — force the landing frame
          // so the card never resolves showing the wrong one.
          if (frameShown !== N - 1) showFrame(N - 1)
          overlay.style.borderRadius = `${CARD_RADIUS}px`
          overlay.style.transform = 'none'
        }
        stopHum()
        finish(splitMode ? 'supercut_split' : 'supercut')
      }

      // Keep the mirrors live through the hold and fade-out — the pieces
      // stop painting anything of their own once fully transparent.
      if (anyMirror() && tc < landedAt + 1200) {
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [frames, setIntroPhase, setIntroTargetCount, cleanupUrls])

  // Start once: frames preloaded and tab visible.
  useEffect(() => {
    if (!frames || startedRef.current) return
    const startWhenVisible = () => {
      if (startedRef.current || document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', startWhenVisible)
      play()
    }
    startWhenVisible()
    document.addEventListener('visibilitychange', startWhenVisible)
    return () => document.removeEventListener('visibilitychange', startWhenVisible)
  }, [frames, play])

  if (phase === 'gone') return null

  const shown = phase === 'cut' || phase === 'landed'
  const fadeStyle = {
    opacity: shown ? 1 : 0,
    transition: phase === 'done' ? 'opacity 0.3s ease-out' : 'none',
  } as const
  const halftoneStyle = {
    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.65) 0.15px, transparent 0.25px)',
    backgroundSize: '0.5px 0.5px',
    opacity: phase === 'cut' ? 1 : 0,
    transition: phase === 'cut' ? ('none' as const) : ('opacity 0.35s ease-out' as const),
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Opaque cover — the page loads behind it; fades at the mid-flight
          reveal so the grid staggers in under the still-flying rectangle. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: revealedEarly ? 'rgba(10, 10, 10, 0)' : 'rgba(10, 10, 10, 1)',
          transition: 'background-color 0.5s ease-out',
        }}
      />

      {/* The supercut rectangle — flies from 80% cover to the mosaic (or, in
          single mode, straight onto the first card), then hands off to the
          pieces below. */}
      <div
        ref={overlayRef}
        className="fixed z-10 overflow-hidden bg-[#0a0a0a]"
        style={{ ...fadeStyle, transformOrigin: 'center', willChange: 'transform' }}
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
        {/* Single-mode landing mirror — a live canvas copy of the first
            card's playing preview, swapped in as the cut's final frame. */}
        <canvas
          ref={mirrorRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ visibility: 'hidden', zIndex: 1 }}
        />
        {/* Halftone screen — dot texture riding the flashes */}
        <div className="absolute inset-0" style={{ ...halftoneStyle, zIndex: 2 }} />
      </div>

      {/* The four pieces — born at the split as the rectangle's quadrants,
          each falling onto its own card with its own video (live mirror or
          blob thumbnail), then fading over the real card underneath. */}
      {Array.from({ length: PIECE_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            pieceRefs.current[i] = el
          }}
          className="fixed z-10 overflow-hidden bg-[#0a0a0a]"
          style={{
            ...fadeStyle,
            visibility: 'hidden',
            borderRadius: CARD_RADIUS,
            transformOrigin: 'center',
            willChange: 'transform',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              pieceImgRefs.current[i] = el
            }}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden' }}
          />
          <canvas
            ref={(el) => {
              pieceCanvasRefs.current[i] = el
            }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden', zIndex: 1 }}
          />
          <div className="absolute inset-0" style={{ ...halftoneStyle, zIndex: 2 }} />
        </div>
      ))}
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
