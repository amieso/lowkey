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
 * catalog — one frame per launch video, speed-ramped — HOLDING its centered
 * spot for HOLD_MS. Then it splits right there, seamlessly, into four
 * quarter pieces: at the split instant each piece renders its exact
 * quadrant of the then-current frame (a 200% shard of the same image,
 * outer corner rounded, inner seams square), so the swap is
 * pixel-invisible — and the supercut DOESN'T STOP: each piece keeps
 * flashing its own dealt stream of catalog frames while it carries the
 * whole journey down into its grid slot on a gentle arc, resolving onto
 * its destination video (live canvas mirror of the card's playing preview,
 * blob thumbnail fallback) in the last stretch of its flight. Pieces
 * launch staggered, so four flashing screens fall into the row one after
 * another, land, hold, and fade into cards that are already playing.
 *
 * On layouts where the first four cards aren't all on screen
 * (single-column mobile), the split is skipped and the rectangle flies to
 * the first card alone. The grid learns which cards to hold back via
 * introTargetCount on the intro context.
 *
 * The shared intro phase flips to 'settling' mid-cut (REVEAL_AT), so the
 * backdrop fades and the header logo and staggered grid assemble UNDER the
 * still-flying rectangle.
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
 *   - The big rectangle flashes stacked pre-mounted <img>s; the pieces
 *     flash via a two-img flip-flop pipeline (the next frame's src is set
 *     one dwell ahead on the hidden img, so a swap never waits on decode).
 *   - FLIP throughout: the big rectangle is laid out on the mosaic rect
 *     (screen-fixed); each piece is laid out on its card's rect —
 *     re-measured every tick so a scroll mid-fall can't make a piece land
 *     beside its card.
 *   - The intro starts on an animation frame, so a hidden tab waits (RAF
 *     is paused there) without any dependence on visibilityState — and a
 *     watchdog (WATCHDOG_MS) lifts the overlay if 'done' never comes.
 *   - No audio: browsers keep AudioContext suspended until a user gesture,
 *     so an auto-playing intro can never sound on a first visit. (The
 *     projector-sound experiment lives on in the /supercut sandbox.)
 */

interface SupercutIntroProps {
  onComplete?: () => void
  onContentReady?: () => void
  /** Photosensitivity-safe treatment (see SAFE_* below): `true` is the
   *  levels clamp (mode 1). `?safe=0|1|2` on the URL overrides this either
   *  way, so the cuts can be A/B'd in place. */
  safe?: boolean
}

// ── timing ───────────────────────────────────────────────────────────────────
const TICK_MS = 1000 / 60
// Speed ramp: dwell per frame eases from RAMP_START_TICKS down to
// RAMP_END_TICKS as the cut's cumulative time approaches the hold, so the
// crescendo completes ON SCREEN before the split (the pieces then keep the
// strobe). Starts faster than the old experimental ramp (which began at 5
// ticks and never got to finish before the handoff).
const RAMP_START_TICKS = 2.5
const RAMP_END_TICKS = 1
const START_COVER = 0.8
// Single mode (portrait phones): a 16:9 rectangle at 80% of a tall viewport
// is a small letterbox band with dead space above and below, so there the cut
// takes the WHOLE viewport instead — the landscape stills cropped to the
// screen's own portrait aspect by object-cover — and morphs its geometry down
// onto the card's 16:9 media box, opening the crop back up as it seats. No
// cover fraction here on purpose: edge-to-edge is the point, and the margin
// that frames the desktop rectangle has nothing to frame it against on a
// phone (the backdrop it would sit on is the same near-black).
// How much of the single-mode cut is spent holding the portrait rect before
// the descent starts — the phone's answer to HOLD_MS (there's no split to
// hand off to, so the hold is a fraction of the schedule rather than a
// wall-clock beat).
const SINGLE_HOLD_FRAC = 0.45
const CARD_RADIUS = 6 // VideoCard's collapsed borderRadius
// The rectangle holds its centered 80% spot, supercutting in place, for
// HOLD_MS — then splits right there (no approach flight): the four pieces
// carry the whole journey down to the row, KEEP flashing while they fly
// for FALL_MS each, launching in symmetric pairs PIECE_STAGGER_MS apart
// (see pieceDelay), and resolve onto their destination video at
// PIECE_RESOLVE_AT of their flight.
const HOLD_MS = 1000
const FALL_MS = 750
const PIECE_STAGGER_MS = 70
const PIECE_RESOLVE_AT = 0.72
// How far into the fall (0..1) the hero's 50% → 100% fade starts. The pieces
// leave the hero's band early — they're born centre-screen and travel DOWN —
// so waiting for the last touchdown made the headline arrive visibly after
// the cards were already seated. Firing mid-fall lets the 0.6s ease finish in
// the same beat as the landing instead of starting there.
const HERO_REVEAL_AT = 0.45
// Piece flashing cadence (in ticks): the big cut hands off at full strobe,
// so the pieces keep flashing at nearly that pace all the way down.
const PIECE_DWELL_START = 1.3
const PIECE_DWELL_END = 1
// How far through the cut (0..1) the page reveal starts: the backdrop fades
// and the grid staggers in UNDER the still-holding rectangle. Must resolve
// to before the split (the check runs in phase A; split() also guarantees
// it as a backstop). The landing cards themselves stay hidden until the
// pieces fade over them.
const REVEAL_AT = 0.28
// The backdrop fades at REVEAL_AT, but the page content keyed off 'settling'
// (grid stagger, header logo) trails it by this much so it doesn't crowd the
// cut still playing above it.
const SETTLE_LEAD_MS = 800
// The rectangle's own entry: it eases in from 0.95× scale and 50% opacity
// over the first ENTRY_MS of the cut instead of popping on.
const ENTRY_MS = 350
const ENTRY_SCALE = 0.95
const ENTRY_OPACITY = 0.75
// Opacity resolves well before the scale does: the rectangle is composited
// over the near-black cover, so a slow ramp leaves the first frames sitting
// dim. The scale keeps the longer ENTRY_MS ease.
const ENTRY_OPACITY_MS = 140
// Frame preload cap. Was 20s: on a slow link that was 20s of opaque black
// with nothing painted — the cut tolerates a short frame list, so it's far
// better to start with whatever has arrived.
const PRELOAD_DEADLINE_MS = 4000
// Hard ceiling on the whole intro, measured from mount. A healthy run is
// preload (<PRELOAD_DEADLINE_MS) + cut (~3s); if 'done' hasn't arrived by
// then — whatever the reason: a WebView that never reports itself visible, a
// stalled RAF, a preload that hangs, an exception in the timeline — the
// overlay lifts and the page reveals as-is. The visitor never sits on a
// black screen with no way out. Reported as GOALS.introWatchdog so the wild
// tells us which gate it was.
const WATCHDOG_MS = 9000

// ── photosensitivity-safe mode ───────────────────────────────────────────────
// Off by default. The live cut is a strobe of full-range stills, so the safe
// variant applies the standard post treatment for flashing content — as one
// filter on the rectangle / piece CONTAINERS (the adjustment-layer over all
// clips: frames, the near-black backing and the halftone all pass through it,
// so nothing can dip to black underneath), plus short crossfades on every
// swap so luminance steps become ramps.
//   1. Levels clamp: output black 70, output white 145 (8-bit) — the flash
//      never leaves the ~27%..57% band, keeping every frame-to-frame delta
//      well under the 10% harmful-flash threshold at any cut rate.
//   2. Dark frames: covered by (1) — the filter sits on the container.
//   3. Desaturate 25% globally (CSS has no per-hue saturation; this keeps
//      saturated reds under the separate red-flash rule).
//   4. 1–2 tick crossfades on every swap (never longer than the dwell, so
//      the frame underneath is always fully covered before it's dropped).
// The clamp ramps off as each piece resolves onto its card (same beat as
// the halftone dissolve), so the handoff to the live, unclamped card is a
// ramp too, never a step.
const SAFE_OUT_BLACK = 70 / 255
const SAFE_OUT_WHITE = 145 / 255
// CSS filters compose as brightness(contrast(x)) = k·(c·(x − ½) + ½), so the
// levels map out = lo + (hi − lo)·x solves to k = lo + hi, c = (hi − lo) / k.
const SAFE_GAIN = SAFE_OUT_BLACK + SAFE_OUT_WHITE
const SAFE_CONTRAST = (SAFE_OUT_WHITE - SAFE_OUT_BLACK) / SAFE_GAIN
const SAFE_SATURATION = 0.75
const SAFE_FILTER = `contrast(${SAFE_CONTRAST.toFixed(4)}) brightness(${SAFE_GAIN.toFixed(4)}) saturate(${SAFE_SATURATION})`
const SAFE_FILTER_OFF = 'contrast(1) brightness(1) saturate(1)'
const SAFE_XFADE_TICKS = 2
const SAFE_UNCLAMP_MS = 300
// Mode 2 — the SORTED cut: same strobe, same crossfades, no clamp. The
// frames are reordered by mean luminance (darkest → brightest, or the
// reverse, whichever ends nearer the landing frame's brightness) so each
// swap is a ~2% luminance step — under the flash threshold — while every
// frame keeps its full contrast and colour. The oldest→newest order is the
// only casualty (unreadable at this cadence anyway). Piece streams then
// PING-PONG through the sorted order instead of wrapping, so no piece ever
// jumps from the bright end back to the dark one.
const SAFE_LUMA_SAMPLE = 32 // px — the thumbnail is downsampled to this width to average

// Mean luminance of an image blob (Rec.709 weights on sRGB values — close
// enough to order frames by), via a tiny canvas. Blob URLs are same-origin,
// so the canvas isn't tainted. Falls back to mid-grey on any failure.
const measureLuma = async (blob: Blob): Promise<number> => {
  try {
    const bmp = await createImageBitmap(blob)
    const w = SAFE_LUMA_SAMPLE
    const h = Math.max(1, Math.round((w * bmp.height) / bmp.width))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 0.5
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const d = ctx.getImageData(0, 0, w, h).data
    let sum = 0
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    return sum / (255 * (d.length / 4))
  } catch {
    return 0.5
  }
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

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


export function SupercutIntro({ onComplete, onContentReady, safe }: SupercutIntroProps) {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  // True once the mid-flight reveal has fired — drives the backdrop fade
  // independently of `phase` (halftone dissolve etc. still key off landing).
  const [revealedEarly, setRevealedEarly] = useState(false)
  // True once the rectangle has split into the pieces. The overlay's hiding
  // is React-owned via this state (belt) in addition to the imperative
  // writes in split() (braces) — so no re-render or remount can ever bring
  // the big rectangle's last frame back as a ghost.
  const [splitFired, setSplitFired] = useState(false)
  const { introPhase, setIntroPhase, setIntroTargetCount, setIntroLandedCount, setIntroHeroReveal, mediaReady } =
    useIntroContext()

  const overlayRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLCanvasElement>(null)
  const frameEls = useRef<(HTMLImageElement | null)[]>([])
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([])
  const pieceShardRefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceFlashARefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceFlashBRefs = useRef<(HTMLImageElement | null)[]>([])
  // Third flash buffer per piece — only used in safe mode, where the
  // previous frame has to stay under the crossfade while the next decodes.
  const pieceFlashCRefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pieceHalftoneRefs = useRef<(HTMLDivElement | null)[]>([])
  const objectUrlsRef = useRef<string[]>([])
  // remote frame URL → local blob URL, for giving pieces their frames.
  const blobBySrcRef = useRef<Map<string, string>>(new Map())
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
  // Set the moment the intro completes (normally or via the watchdog), so
  // the two paths can't both fire completion side effects.
  const doneRef = useRef(false)
  const phaseRef = useRef<Phase>('waiting')
  phaseRef.current = phase
  const framesRef = useRef<string[] | null>(null)
  framesRef.current = frames
  // ── ?introdebug=1 readout ──────────────────────────────────────────────
  // A fixed on-screen text HUD (no console needed) for the field: phase,
  // context phase, frame count, tick count, worst RAF gap, clock. Enough to
  // tell a preload stall from a RAF stall from a WebView that never fires
  // anything — from a screenshot.
  const [debugOn, setDebugOn] = useState(false)
  const debugRef = useRef({ mountedAt: 0, framesAt: 0, playAt: 0, ticks: 0, maxGap: 0, lastTick: 0 })
  const [debugTick, setDebugTick] = useState(0)
  useEffect(() => {
    debugRef.current.mountedAt = performance.now()
    if (!new URLSearchParams(window.location.search).has('introdebug')) return
    setDebugOn(true)
    const id = window.setInterval(() => setDebugTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [])
  // Safe mode resolves once at mount (prop, overridden by ?safe=0/1) —
  // play() reads the ref, so the URL never has to reach the render path.
  const safeRef = useRef(0)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('safe')
    safeRef.current = q !== null ? (q === '2' ? 2 : q === '0' ? 0 : 1) : safe ? 1 : 0
  }, [safe])
  // blob URL → mean luminance (0..1), measured at preload for the sorted cut.
  const lumaByUrlRef = useRef<Map<string, number>>(new Map())

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
        if (safeRef.current === 2) lumaByUrlRef.current.set(url, await measureLuma(blob))
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
      debugRef.current.framesAt = performance.now()
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
    // Set once the intro reaches 'done', so a fast finish can't let the
    // trailing settle timer flip the phase backwards.
    let settled = false
    const reveal = () => {
      if (revealed) return
      revealed = true
      setRevealedEarly(true)
      timersRef.current.push(
        window.setTimeout(() => {
          if (!settled) setIntroPhase('settling')
        }, SETTLE_LEAD_MS),
      )
      onContentReadyRef.current?.()
    }

    const finish = (variant: string) => {
      reveal()
      setPhase('landed')
      // Short tail: cards swallow clicks until introComplete ('done'), so
      // the moment the landing looks finished it must BE finished — 150ms
      // beat, 300ms piece fade, gone. No dead-to-input period at the end.
      timersRef.current.push(
        window.setTimeout(() => {
          settled = true
          if (doneRef.current) return // the watchdog got here first
          doneRef.current = true
          setPhase('done')
          setIntroPhase('done')
          trackGoal(GOALS.introCompleted, {
            waited_for_media: mediaReadyRef.current ? 'false' : 'true',
            variant,
          })
          onCompleteRef.current?.()
        }, 150),
      )
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('gone')
          cleanupUrls() // ~48 decoded blobs have no business outliving the intro
        }, 500),
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
      setIntroHeroReveal(true)
      finish('supercut_fallback')
      return
    }
    startedRef.current = true
    debugRef.current.playAt = performance.now()

    const mode = safeRef.current
    const safe = mode > 0 // crossfades + triple-buffered pieces
    const clamp = mode === 1 // levels clamp on the containers
    const sorted = mode === 2 // luminance-ordered cut
    const xfadeFor = (dwellMs: number) => Math.min(SAFE_XFADE_TICKS * TICK_MS, dwellMs)
    // Crossfade a layer in over the one beneath it (Web Animations, so the
    // React-owned inline transitions can never cut it short).
    const fadeIn = (el: HTMLElement, ms: number) => {
      el.getAnimations().forEach((a) => a.cancel())
      el.style.visibility = 'visible'
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'linear', fill: 'forwards' })
    }
    // Ramp the levels clamp off a container — the handoff to the unclamped
    // card underneath becomes a 300ms ramp instead of a luminance step.
    const unclamp = (el: HTMLElement) => {
      if (!clamp) return
      el.animate([{ filter: SAFE_FILTER }, { filter: SAFE_FILTER_OFF }], {
        duration: SAFE_UNCLAMP_MS,
        easing: 'ease-out',
        fill: 'forwards',
      })
    }
    if (clamp) {
      overlay.style.filter = SAFE_FILTER
      pieceRefs.current.forEach((n) => {
        if (n) n.style.filter = SAFE_FILTER
      })
    }

    const vw = window.innerWidth
    const vh = window.innerHeight

    // Split only when all four cards are (mostly) on screen — on a
    // single-column phone the lower cards sit below the fold and pieces
    // would fly off-screen; there the rectangle lands on card one alone.
    // Land on each card's 16:9 MEDIA box, not the whole grid cell — the
    // cell also contains the company/title/stats row below the video, and a
    // piece blanketing that row with a video frame reads as a misaligned
    // landing. VideoCard marks the box with data-supercut-media.
    const mediaEls = targets.map(
      (el) => el.querySelector<HTMLElement>('[data-supercut-media]') ?? el,
    )
    const targetRects = mediaEls.map((el) => el.getBoundingClientRect())
    const splitMode =
      targets.length === PIECE_COUNT &&
      targetRects.every((r) => r.width > 0 && r.top >= 0 && r.top + r.height * 0.6 <= vh)
    setIntroTargetCount(splitMode ? PIECE_COUNT : 1)
    setPhase('cut')

    // Start rect: split mode covers START_COVER of the viewport, centered, at
    // 16:9 (the quadrants have to match the cards' aspect). Single mode on a
    // tall viewport takes the whole screen.
    const portrait = !splitMode && vh > vw
    let startW: number
    let startH: number
    if (portrait) {
      startW = vw
      startH = vh
    } else {
      startW = vw * START_COVER
      startH = (startW * 9) / 16
      if (startH > vh * START_COVER) {
        startH = vh * START_COVER
        startW = (startH * 16) / 9
      }
    }
    const startLeft = (vw - startW) / 2
    const startTop = (vh - startH) / 2

    // Single mode's descent: geometry, not a uniform scale. A portrait rect
    // can't reach a 16:9 card by scaling (that would either distort the frames
    // or keep the portrait shape all the way down), so left/top/width/height are
    // interpolated per tick and object-cover re-crops each frame as the box
    // widens — the landing is the card's exact media box.
    const layoutSingle = (p: number) => {
      const card = mediaEls[0].getBoundingClientRect()
      overlay.style.left = `${lerp(startLeft, card.left, p).toFixed(2)}px`
      overlay.style.top = `${lerp(startTop, card.top, p).toFixed(2)}px`
      overlay.style.width = `${lerp(startW, card.width, p).toFixed(2)}px`
      overlay.style.height = `${lerp(startH, card.height, p).toFixed(2)}px`
      overlay.style.borderRadius = `${(CARD_RADIUS * p).toFixed(2)}px`
    }

    // The big rectangle never flies in split mode: it holds the centered
    // start rect for HOLD_MS, and the "mosaic" the pieces are born from IS
    // that rect — its quadrants keep the 16:9 card aspect, so the pieces
    // shrink uniformly as they carry the whole journey down to the row.
    // (The phase-A flight math degenerates cleanly: zero translate, scale 1.)
    // Single mode: the first card's rect, re-measured every tick, as before.
    const r0 = targetRects[0]
    let mosaic: Rect | null = null
    let quadOrder: number[] = [0, 1, 2, 3] // quadrant index (TL,TR,BL,BR) per card
    let oneRow = false
    if (splitMode) {
      const sameRow = (a: DOMRect, b: DOMRect) => Math.abs(a.top - b.top) < 2
      mosaic = {
        left: (vw - startW) / 2,
        top: (vh - startH) / 2,
        width: startW,
        height: startH,
      }
      // Quadrants are handed to cards so the four paths stay similar in
      // shape and length: when all four cards sit in one row, the top
      // quadrants take the outer slots and the bottom ones the inner slots
      // (TL→0, BL→1, BR→2, TR→3), so each piece travels roughly the same
      // distance and no path crosses another. In a 2×2 grid it's the
      // natural reading order.
      oneRow = targetRects.every((r) => sameRow(r, r0))
      quadOrder = oneRow ? [0, 2, 3, 1] : [0, 1, 2, 3]
    }

    // Dwell schedule — the ramp is TIME-based: each frame's dwell eases from
    // RAMP_START_TICKS to RAMP_END_TICKS as the cumulative time approaches
    // HOLD_MS, so the acceleration lands fully within the visible hold.
    const N = frames.length
    // The cut order: cut[f] is the frame shown at cut position f, cutIdx[f]
    // its index in `frames` (= the stacked <img> it lives in). Identity
    // normally; the sorted mode reorders everything but the landing frame.
    let cutIdx = frames.map((_, i) => i)
    if (sorted && N > 2) {
      const luma = (i: number) => lumaByUrlRef.current.get(frames[i]) ?? 0.5
      const asc = cutIdx.slice(0, N - 1).sort((a, b) => luma(a) - luma(b))
      const L = luma(N - 1)
      if (Math.abs(luma(asc[asc.length - 1]) - L) > Math.abs(luma(asc[0]) - L)) asc.reverse()
      cutIdx = [...asc, N - 1]
    }
    const cut = cutIdx.map((i) => frames[i])
    // Position in the piece streams: wraps normally; ping-pongs over the
    // sorted body (positions 0..N-2) so a stream never jumps bright → dark.
    const streamPos = (p: number) => {
      if (!sorted) return p % N
      const len = N - 1
      if (len < 2) return 0
      const m = p % (2 * (len - 1))
      return m < len ? m : 2 * (len - 1) - m
    }
    const entries: { frame: number; dur: number }[] = []
    let cumMs = 0
    for (let i = 0; i < N; i++) {
      const u = clamp01(cumMs / HOLD_MS)
      const dur = Math.max(1, lerp(RAMP_START_TICKS, RAMP_END_TICKS, u)) * TICK_MS
      entries.push({ frame: i, dur })
      cumMs += dur
    }
    const cum: number[] = [0]
    for (const e of entries) cum.push(cum[cum.length - 1] + e.dur)
    const duration = cum[cum.length - 1]
    // In split mode the big rectangle's share of the cut is the hold; the
    // pieces carry the supercut (and all the movement) the rest of the way.
    // Guard against tiny catalogs where the schedule is shorter than the hold.
    const splitTime = splitMode ? Math.min(HOLD_MS, duration * 0.8) : duration
    // Launch order matches the quadrant mapping: in one row the outer pair
    // (the top quadrants, longest arcs) leaves first and the inner pair
    // follows a beat later, so the four read as one symmetric fan instead of
    // a left-to-right ripple. Off the one-row layout it stays a plain ripple.
    const pieceDelay = (oneRow ? [0, 1, 1, 0] : [0, 1, 2, 3]).map(
      (step) => step * PIECE_STAGGER_MS,
    )
    const lastLaunch = Math.max(...pieceDelay)
    const fallEnd = splitMode ? splitTime + lastLaunch + FALL_MS : duration

    let entryShown = -1
    let frameShown = -1
    let splitDone = false
    let landedFlag = false
    let landedAt = 0
    const pieceRects: Rect[] = targetRects.map((r) => ({
      left: 0,
      top: 0,
      width: r.width,
      height: r.height,
    }))
    // Per-piece flashing pipeline state.
    const pieceStream: string[][] = [[], [], [], []]
    const pieceStep: number[] = [0, 0, 0, 0]
    const pieceNextFlashAt: number[] = [0, 0, 0, 0]
    const pieceFlip: number[] = [0, 0, 0, 0]
    const pieceResolved: boolean[] = [false, false, false, false]
    const pieceLanded: boolean[] = [false, false, false, false]
    let start = performance.now()
    let lastTick = start

    // The hero's 50% → 100% fade. Idempotent, so the mid-fall trigger and the
    // landing backstop can both call it.
    let heroRevealed = false
    const revealHero = () => {
      if (heroRevealed) return
      heroRevealed = true
      setIntroHeroReveal(true)
    }

    // Frames still painted in safe mode (the crossfade trail), as cut
    // positions; and a rising z so a fading-in frame is always on top even
    // when the cut order differs from the DOM order (sorted mode).
    let visibleFrames: number[] = []
    let frameZ = 10
    const showFrame = (f: number, dwellMs = TICK_MS) => {
      const els = frameEls.current
      const el = (pos: number) => (pos >= 0 ? els[cutIdx[pos]] : null)
      if (!safe) {
        if (frameShown >= 0 && el(frameShown)) el(frameShown)!.style.visibility = 'hidden'
        if (f >= 0 && el(f)) el(f)!.style.visibility = 'visible'
        frameShown = f
        return
      }
      // Safe: the new frame fades in ON TOP of the previous one (frames are
      // stacked in cut order, so a later index is always above). Older
      // frames are dropped only once they're fully covered — the fade never
      // outlasts a dwell, so two frames back is already invisible.
      if (f < 0) {
        visibleFrames.forEach((k) => {
          if (el(k)) el(k)!.style.visibility = 'hidden'
        })
        visibleFrames = []
        frameShown = -1
        return
      }
      const node = el(f)
      if (node) {
        node.style.zIndex = String(frameZ++)
        fadeIn(node, xfadeFor(dwellMs))
      }
      visibleFrames = visibleFrames.filter((k) => {
        if (k < f - 2 && el(k)) {
          el(k)!.style.visibility = 'hidden'
          return false
        }
        return true
      })
      visibleFrames.push(f)
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

    // Hand off from the one big rectangle to the four pieces, seamlessly:
    // each piece is laid out on its card, FLIP-transformed back onto its
    // quadrant of the mosaic, and initially shows a SHARD of the cut's
    // then-current frame — the same image the big rectangle was showing, at
    // 200% size, offset so the piece renders exactly its quadrant of it.
    // Together the four shards reproduce the rectangle pixel-for-pixel, so
    // the swap is invisible. The supercut then continues WITHIN each piece:
    // the remaining catalog frames are dealt round-robin across the pieces
    // (stride 4, so no two pieces flash the same frame at the same time).
    const split = () => {
      splitDone = true
      reveal() // guarantee the page is revealing by the time pieces fly
      // Kill the big rectangle three ways: imperatively now (visibility +
      // display), and via React state so any later re-render/remount keeps
      // it dead instead of resurrecting its last frame as a center ghost.
      overlay.style.visibility = 'hidden'
      overlay.style.display = 'none'
      setSplitFired(true)
      const shardSrc = cut[Math.max(0, frameShown)]
      const dealFrom = Math.max(0, frameShown) + 1
      for (let i = 0; i < PIECE_COUNT; i++) {
        const node = pieceRefs.current[i]
        if (!node || !mosaic) continue
        syncRect(mediaEls[i], node, pieceRects[i])
        const q = quadOrder[i]
        const shard = pieceShardRefs.current[i]
        if (shard) {
          shard.src = shardSrc
          shard.style.left = `${-(q % 2) * 100}%`
          shard.style.top = `${-Math.floor(q / 2) * 100}%`
          shard.style.visibility = 'visible'
        }
        // Deal this piece its continuation of the cut, and pre-set the
        // first frame on the hidden flip img so the first flash is instant.
        const stream: string[] = []
        for (let k = 0; k < 16; k++) stream.push(cut[streamPos(dealFrom + i + k * PIECE_COUNT)])
        pieceStream[i] = stream
        const prep = pieceFlashARefs.current[i]
        if (prep) prep.src = stream[0]
        pieceNextFlashAt[i] = splitTime + lerp(PIECE_DWELL_START, PIECE_DWELL_END, 0) * TICK_MS
        node.style.visibility = 'visible'
      }
    }

    // A piece's flash buffers as a ring: pieceFlip[i] indexes the img
    // prepared last time (shown next), the one after it is prepared now.
    // Two buffers live; safe mode adds a third so the previous frame stays
    // painted under the crossfade while the next one decodes.
    const pieceRing = (i: number): HTMLImageElement[] | null => {
      const a = pieceFlashARefs.current[i]
      const b = pieceFlashBRefs.current[i]
      const c = pieceFlashCRefs.current[i]
      if (!a || !b) return null
      return safe && c ? [a, b, c] : [a, b]
    }

    // One flash inside a piece: show the img prepared last time, prepare the
    // next frame on the now-hidden one. Double-buffering means a swap never
    // waits on image decode.
    const pieceFlash = (i: number, u: number, tc: number) => {
      const ring = pieceRing(i)
      if (!ring) return
      const L = ring.length
      const showEl = ring[pieceFlip[i] % L]
      const prepEl = ring[(pieceFlip[i] + 1) % L]
      const dwell = lerp(PIECE_DWELL_START, PIECE_DWELL_END, u) * TICK_MS
      const shard = pieceShardRefs.current[i]
      if (safe) {
        // Stack: new frame fading in (z4) over the previous one (z3); the
        // buffer two flashes back is fully covered by now and gets reused.
        const prevEl = ring[(pieceFlip[i] + 2) % L]
        prevEl.style.zIndex = '3'
        showEl.style.zIndex = '4'
        prepEl.style.zIndex = '1'
        fadeIn(showEl, xfadeFor(dwell))
        if (shard && shard.style.visibility !== 'hidden') {
          // The shard is what this first flash fades in over — drop it once
          // it's covered (the timer's slack is harmless: z3/z4 cover it).
          const s = shard
          timersRef.current.push(window.setTimeout(() => void (s.style.visibility = 'hidden'), SAFE_XFADE_TICKS * TICK_MS * 2))
        }
      } else {
        showEl.style.visibility = 'visible'
        if (shard) shard.style.visibility = 'hidden'
      }
      prepEl.style.visibility = 'hidden'
      pieceFlip[i] = (pieceFlip[i] + 1) % L
      pieceStep[i]++
      prepEl.src = pieceStream[i][pieceStep[i] % pieceStream[i].length]
      pieceNextFlashAt[i] = tc + dwell
    }

    // A piece's resolve: the flashing stops on its destination video, and
    // its halftone dissolves — it's becoming a real card now. The
    // destination thumbnail is ALWAYS parked in the visible img slot, even
    // when the live mirror starts: the canvas sits above it while it works,
    // and if the mirror ever fails or lags, what shows through is the right
    // video — never a leftover flash frame of some other launch.
    const pieceResolve = (i: number) => {
      const remote = sizedThumbnail(ITEMS[i].thumbnailUrl!, 640)
      const dest = blobBySrcRef.current.get(remote) ?? remote
      const ring = pieceRing(i)
      const showEl = ring ? ring[pieceFlip[i] % ring.length] : null
      const others = ring ? ring.filter((el) => el !== showEl) : []
      const shard = pieceShardRefs.current[i]
      if (showEl) {
        showEl.src = dest
        if (safe) {
          // The destination fades in over the last flash frame, then the
          // rest of the ring drops away underneath it — and the levels clamp
          // ramps off with the halftone, so the piece meets its card's real
          // luminance as a ramp, not a step.
          showEl.style.zIndex = '4'
          fadeIn(showEl, SAFE_XFADE_TICKS * TICK_MS)
          timersRef.current.push(
            window.setTimeout(() => {
              others.forEach((el) => void (el.style.visibility = 'hidden'))
              if (shard) shard.style.visibility = 'hidden'
            }, SAFE_XFADE_TICKS * TICK_MS * 2),
          )
          const node = pieceRefs.current[i]
          if (node) unclamp(node)
        } else {
          showEl.style.visibility = 'visible'
        }
      }
      if (!safe) {
        others.forEach((el) => void (el.style.visibility = 'hidden'))
        if (shard) shard.style.visibility = 'hidden'
      }
      startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])
      const ht = pieceHalftoneRefs.current[i]
      if (ht) {
        ht.style.transition = 'opacity 0.3s ease-out'
        ht.style.opacity = '0'
      }
    }

    const pieceTransform = (i: number, u: number) => {
      const node = pieceRefs.current[i]
      if (!node || !mosaic) return
      const c = syncRect(mediaEls[i], node, pieceRects[i])
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
      // Curved flight: a gentle bow perpendicular to the travel direction
      // (upward-biased), zero at both ends so the split handoff and the
      // seating stay pixel-exact. No rotation — just the arc.
      const len = Math.hypot(dx, dy) || 1
      let px = -dy / len
      let py = dx / len
      if (py > 0) {
        px = -px
        py = -py
      }
      const bow = Math.min(20, len * 0.09) * Math.sin(Math.PI * e)
      node.style.transform = `translate(${(dx * (1 - e) + px * bow).toFixed(2)}px, ${(dy * (1 - e) + py * bow).toFixed(2)}px) scale(${lerp(sx, 1, e).toFixed(4)}, ${lerp(sy, 1, e).toFixed(4)})`
      // Corners: at the split instant only the piece's OUTER corner carries
      // the rectangle's radius (inner corners are flush seams); the inner
      // ones round to the card radius as the pieces separate.
      const inner = (CARD_RADIUS * e).toFixed(2)
      const R = `${CARD_RADIUS}px`
      const r = `${inner}px`
      // border-radius order: top-left, top-right, bottom-right, bottom-left
      node.style.borderRadius =
        q === 0 ? `${R} ${r} ${r} ${r}` : q === 1 ? `${r} ${R} ${r} ${r}` : q === 2 ? `${r} ${r} ${r} ${R}` : `${r} ${r} ${R} ${r}`
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
      const dbg = debugRef.current
      dbg.ticks++
      if (dbg.lastTick) dbg.maxGap = Math.max(dbg.maxGap, now - dbg.lastTick)
      dbg.lastTick = now
      // RAF pauses in hidden tabs — shift the clock over big gaps so the cut
      // resumes where it paused instead of skipping straight to the landing.
      if (now - lastTick > 500) start += now - lastTick
      lastTick = now
      const tc = now - start // schedule clock

      // ── phase A: the cut on the big rectangle, flying to the mosaic ──
      if (tc < splitTime) {
        // Entry: ease in from ENTRY_SCALE/ENTRY_OPACITY. In split mode it
        // multiplies into the FLIP scale (both animations compose); in single
        // mode it's the only transform, riding on top of the geometry morph.
        const te = clamp01(tc / ENTRY_MS)
        const entry = 1 - Math.pow(1 - te, 3)
        const to = clamp01(tc / ENTRY_OPACITY_MS)
        const entryOpacity = 1 - Math.pow(1 - to, 3)
        overlay.style.opacity =
          to < 1 ? lerp(ENTRY_OPACITY, 1, entryOpacity).toFixed(3) : '1'

        if (splitMode && mosaic) {
          const rect = mosaic // screen-fixed — no measuring needed
          const scale0 = startW / rect.width
          const dx0 = vw / 2 - (rect.left + rect.width / 2)
          const dy0 = vh / 2 - (rect.top + rect.height / 2)
          // The flight completes exactly at the split — pieces launch from rest.
          const p = easeInOutCubic(clamp01(tc / splitTime))
          const s = lerp(scale0, 1, p)
          overlay.style.transform = `translate(${lerp(dx0, 0, p)}px, ${lerp(dy0, 0, p)}px) scale(${s * lerp(ENTRY_SCALE, 1, entry)})`
          // Corner morph, scale-compensated: the on-screen radius is an exact
          // 0 → CARD_RADIUS ease regardless of the rectangle's current size.
          overlay.style.borderRadius = `${((CARD_RADIUS * p) / s).toFixed(2)}px`
        } else {
          // Hold the (portrait) rect for the first SINGLE_HOLD_FRAC of the
          // cut, supercutting in place, then descend onto the card — the same
          // hold-then-travel rhythm the split gives the desktop.
          const p = easeInOutCubic(
            clamp01((tc / splitTime - SINGLE_HOLD_FRAC) / (1 - SINGLE_HOLD_FRAC)),
          )
          layoutSingle(p)
          // Fullscreen has no room to ease in from: scaling a screen-filling
          // rect down to ENTRY_SCALE would open black gutters along every
          // edge, so portrait enters on opacity alone.
          overlay.style.transform = portrait ? 'none' : `scale(${lerp(ENTRY_SCALE, 1, entry)})`
          // Same beat as the split's fall: the shrinking rect has uncovered
          // the hero well before it seats.
          if (p >= HERO_REVEAL_AT) revealHero()
        }

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
            unclamp(overlay)
          } else {
            showFrame(f, entries[e].dur)
            if (!splitMode && f === N - 1) unclamp(overlay)
          }
        }
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── phase B: the pieces fly, still supercutting (split mode only) ──
      if (splitMode && tc < fallEnd) {
        if (!splitDone) split()
        for (let i = 0; i < PIECE_COUNT; i++) {
          const u = clamp01((tc - splitTime - pieceDelay[i]) / FALL_MS)
          pieceTransform(i, u)
          // Mid-fall: the pieces have left the hero's band, so start its fade
          // now — waiting for the last touchdown landed the headline after
          // the cards. The first piece to reach the mark carries it.
          if (u >= HERO_REVEAL_AT) revealHero()
          if (!pieceResolved[i]) {
            if (u >= PIECE_RESOLVE_AT) {
              pieceResolved[i] = true
              pieceResolve(i)
            } else if (tc >= pieceNextFlashAt[i]) {
              pieceFlash(i, u, tc)
            }
          }
          if (u >= 1 && !pieceLanded[i]) {
            pieceLanded[i] = true
            // Reveal this card NOW (its piece covers the media box, so this
            // is the meta text fading in right at touchdown). Count actual
            // touchdowns rather than the index — pieces launch in pairs, so
            // they do NOT seat in card order.
            setIntroLandedCount(pieceLanded.filter(Boolean).length)
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
        // Backstop: normally the fade already started mid-fall, but a clock
        // jump can skip straight past HERO_REVEAL_AT.
        revealHero()
        if (splitMode) {
          if (!splitDone) split() // clock-jump safety: never skip the handoff
          for (let i = 0; i < PIECE_COUNT; i++) {
            pieceTransform(i, 1)
            if (!pieceResolved[i]) {
              pieceResolved[i] = true
              pieceResolve(i)
            }
            if (!pieceLanded[i]) {
              pieceLanded[i] = true
              setIntroLandedCount(pieceLanded.filter(Boolean).length)
              startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])
            }
          }
        } else {
          // Clock jumps can skip schedule entries — force the landing frame
          // so the card never resolves showing the wrong one.
          if (frameShown !== N - 1) {
            showFrame(N - 1)
            unclamp(overlay)
          }
          setIntroLandedCount(1) // single mode: reveal card one at touchdown
          layoutSingle(1) // seat exactly on the card's media box
          overlay.style.transform = 'none'
        }
        finish((splitMode ? 'supercut_split' : 'supercut') + (mode ? `_safe${mode}` : ''))
      }

      // Keep the mirrors live through the hold and fade-out — the pieces
      // stop painting anything of their own once fully transparent.
      if (anyMirror() && tc < landedAt + 700) {
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [frames, setIntroPhase, setIntroTargetCount, setIntroLandedCount, setIntroHeroReveal, cleanupUrls])

  // Scrolling mid-intro breaks the choreography — the mosaic is screen-fixed
  // and the landing targets would move out from under the falling pieces.
  // Lock the page until the landing is done (the same moment clicks go live).
  useEffect(() => {
    if (phase === 'done' || phase === 'gone') return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [phase])

  // Start once the frames are in, on the next animation frame. RAF is the
  // visibility gate: browsers only run it while the page is actually being
  // painted, so a hidden tab still waits — but unlike the old
  // `document.visibilityState` check, an embedded WebView that misreports
  // itself as hidden (and never fires visibilitychange) can't hold the
  // intro on a black screen forever. The clock-shift in tick() covers the
  // case where the tab goes hidden mid-cut.
  useEffect(() => {
    if (!frames || startedRef.current) return
    const id = requestAnimationFrame(() => play())
    return () => cancelAnimationFrame(id)
  }, [frames, play])

  // Emergency exit: reveal the page as-is, skipping whatever is left of the
  // intro. Safe from any state — before play() (no frames yet), mid-cut, or
  // after a stalled tick — and idempotent against the normal finish.
  const skipIntro = useCallback(
    (reason: string) => {
      if (doneRef.current) return
      doneRef.current = true
      startedRef.current = true // play() must not start a cut over the reveal
      cancelAnimationFrame(rafRef.current)
      timersRef.current.forEach((t) => window.clearTimeout(t))
      timersRef.current = []
      if (overlayRef.current) overlayRef.current.style.visibility = 'hidden'
      pieceRefs.current.forEach((n) => {
        if (n) n.style.visibility = 'hidden'
      })
      trackGoal(GOALS.introWatchdog, {
        reason,
        phase: phaseRef.current,
        visibility: document.visibilityState,
        frames: framesRef.current ? String(framesRef.current.length) : 'none',
      })
      setRevealedEarly(true)
      setIntroTargetCount(0) // no piece will seat: release every card
      setIntroHeroReveal(true)
      setPhase('done')
      setIntroPhase('done')
      onContentReadyRef.current?.()
      onCompleteRef.current?.()
      window.setTimeout(() => {
        setPhase('gone')
        cleanupUrls()
      }, 400)
    },
    [setIntroPhase, setIntroTargetCount, setIntroHeroReveal, cleanupUrls],
  )

  // The watchdog — see WATCHDOG_MS. Timers keep running in hidden WebViews
  // (throttled), so this fires even where RAF never does.
  useEffect(() => {
    const id = window.setTimeout(() => skipIntro('watchdog'), WATCHDOG_MS)
    return () => window.clearTimeout(id)
  }, [skipIntro])

  const hud = debugOn ? (
    <pre
      className="fixed left-2 top-2 z-[200] rounded bg-black/80 px-3 py-2 text-[13px] leading-snug text-white"
      style={{ pointerEvents: 'none', fontFamily: 'ui-monospace, monospace' }}
    >
      {[
        `t     ${Math.round(performance.now() - debugRef.current.mountedAt)}ms since mount (tick ${debugTick})`,
        `phase ${phase} / ctx ${introPhase}`,
        `frames ${frames ? frames.length : 'loading'}${debugRef.current.framesAt ? ` @${Math.round(debugRef.current.framesAt - debugRef.current.mountedAt)}ms` : ''}`,
        `play  ${debugRef.current.playAt ? `@${Math.round(debugRef.current.playAt - debugRef.current.mountedAt)}ms` : 'not started'}`,
        `ticks ${debugRef.current.ticks}  maxGap ${Math.round(debugRef.current.maxGap)}ms`,
        `vis   ${typeof document !== 'undefined' ? document.visibilityState : '?'}  ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` : ''}`,
        `done  ${doneRef.current}`,
      ].join('\n')}
    </pre>
  ) : null

  if (phase === 'gone') return hud

  const shown = phase === 'cut' || phase === 'landed'
  const fadeStyle = {
    opacity: shown ? 1 : 0,
    transition: phase === 'done' ? 'opacity 0.3s ease-out' : 'none',
  } as const
  const halftoneStyle = {
    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.45) 0.15px, transparent 0.25px)',
    backgroundSize: '0.5px 0.5px',
    opacity: phase === 'cut' ? 1 : 0,
    transition: phase === 'cut' ? ('none' as const) : ('opacity 0.35s ease-out' as const),
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {hud}
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
        style={{
          ...fadeStyle,
          transformOrigin: 'center',
          willChange: 'transform',
          // React-owned kill switch — see split().
          ...(splitFired ? { display: 'none' as const } : null),
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
        {/* Single-mode landing mirror — a live canvas copy of the first
            card's playing preview, swapped in as the cut's final frame. */}
        <canvas
          ref={mirrorRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ visibility: 'hidden', zIndex: 1000 }}
        />
        {/* Halftone screen — dot texture riding the flashes (z above the
            rising per-frame z of the safe modes' crossfade stack) */}
        <div className="absolute inset-0" style={{ ...halftoneStyle, zIndex: 1001 }} />
      </div>

      {/* The four pieces — born at the split as the rectangle's quadrants
          (shard of the current frame), each continuing the supercut with its
          own dealt frame stream while falling onto its card, resolving to
          the card's live preview, then fading over the real card. */}
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
          {/* Flip-flop pair for the piece's own supercut */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              pieceFlashARefs.current[i] = el
            }}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden', zIndex: 1 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              pieceFlashBRefs.current[i] = el
            }}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden', zIndex: 1 }}
          />
          {/* Third buffer — safe mode only (crossfade trail). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              pieceFlashCRefs.current[i] = el
            }}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden', zIndex: 1 }}
          />
          {/* The shard: the split-instant frame at 200%, offset per quadrant
              in split(), so the four pieces initially reproduce the big
              rectangle pixel-for-pixel. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              pieceShardRefs.current[i] = el
            }}
            alt=""
            className="absolute object-cover"
            style={{ visibility: 'hidden', width: '200%', height: '200%', zIndex: 2 }}
          />
          <canvas
            ref={(el) => {
              pieceCanvasRefs.current[i] = el
            }}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ visibility: 'hidden', zIndex: 5 }}
          />
          <div
            ref={(el) => {
              pieceHalftoneRefs.current[i] = el
            }}
            className="absolute inset-0"
            style={{ ...halftoneStyle, zIndex: 6 }}
          />
        </div>
      ))}
    </div>
  )
}

