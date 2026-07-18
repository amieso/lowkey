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
 *   - The intro waits for the tab to be visible before starting — RAF is
 *     paused in hidden tabs and the one-shot intro shouldn't burn there.
 *   - No audio: browsers keep AudioContext suspended until a user gesture,
 *     so an auto-playing intro can never sound on a first visit. (The
 *     projector-sound experiment lives on in the /supercut sandbox.)
 */

interface SupercutIntroProps {
  onComplete?: () => void
  onContentReady?: () => void
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
const CARD_RADIUS = 6 // VideoCard's collapsed borderRadius
// The rectangle holds its centered 80% spot, supercutting in place, for
// HOLD_MS — then splits right there (no approach flight): the four pieces
// carry the whole journey down to the row, KEEP flashing while they fly
// for FALL_MS each, launching PIECE_STAGGER_MS apart, and resolve onto
// their destination video at PIECE_RESOLVE_AT of their flight.
const HOLD_MS = 1000
const FALL_MS = 750
const PIECE_STAGGER_MS = 70
const PIECE_RESOLVE_AT = 0.72
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
// The rectangle's own entry: it eases in from 0.95× scale and 50% opacity
// over the first ENTRY_MS of the cut instead of popping on.
const ENTRY_MS = 350
const ENTRY_SCALE = 0.95
const ENTRY_OPACITY = 0.75
const PRELOAD_DEADLINE_MS = 20000

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


export function SupercutIntro({ onComplete, onContentReady }: SupercutIntroProps) {
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
  const { setIntroPhase, setIntroTargetCount, setIntroLandedCount, setIntroHeroReveal, mediaReady } =
    useIntroContext()

  const overlayRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLCanvasElement>(null)
  const frameEls = useRef<(HTMLImageElement | null)[]>([])
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([])
  const pieceShardRefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceFlashARefs = useRef<(HTMLImageElement | null)[]>([])
  const pieceFlashBRefs = useRef<(HTMLImageElement | null)[]>([])
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
      // Short tail: cards swallow clicks until introComplete ('done'), so
      // the moment the landing looks finished it must BE finished — 150ms
      // beat, 300ms piece fade, gone. No dead-to-input period at the end.
      timersRef.current.push(
        window.setTimeout(() => {
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

    // Start rect: centered, covering START_COVER of the viewport at 16:9.
    let startW = vw * START_COVER
    let startH = (startW * 9) / 16
    if (startH > vh * START_COVER) {
      startH = vh * START_COVER
      startW = (startH * 16) / 9
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
    if (splitMode) {
      const sameRow = (a: DOMRect, b: DOMRect) => Math.abs(a.top - b.top) < 2
      mosaic = {
        left: (vw - startW) / 2,
        top: (vh - startH) / 2,
        width: startW,
        height: startH,
      }
      // Quadrants are handed to cards so paths don't cross: when all four
      // cards sit in one row, columns of the mosaic map to card order
      // (TL,BL,TR,BR → cards 0..3); in a 2×2 grid it's the natural reading
      // order.
      const oneRow = targetRects.every((r) => sameRow(r, r0))
      quadOrder = oneRow ? [0, 2, 1, 3] : [0, 1, 2, 3]
    }

    // Dwell schedule — the ramp is TIME-based: each frame's dwell eases from
    // RAMP_START_TICKS to RAMP_END_TICKS as the cumulative time approaches
    // HOLD_MS, so the acceleration lands fully within the visible hold.
    const N = frames.length
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
    const fallEnd = splitMode
      ? splitTime + (PIECE_COUNT - 1) * PIECE_STAGGER_MS + FALL_MS
      : duration

    let entryShown = -1
    let frameShown = -1
    let splitDone = false
    let landedFlag = false
    let landedAt = 0
    let lastRect: Rect = { left: 0, top: 0, width: 0, height: 0 }
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
      const shardSrc = frames[Math.max(0, frameShown)]
      const dealFrom = (Math.max(0, frameShown) + 1) % N
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
        for (let k = 0; k < 16; k++) stream.push(frames[(dealFrom + i + k * PIECE_COUNT) % N])
        pieceStream[i] = stream
        const prep = pieceFlashARefs.current[i]
        if (prep) prep.src = stream[0]
        pieceNextFlashAt[i] = splitTime + lerp(PIECE_DWELL_START, PIECE_DWELL_END, 0) * TICK_MS
        node.style.visibility = 'visible'
      }
    }

    // One flash inside a piece: show the img prepared last time, prepare the
    // next frame on the now-hidden one. Double-buffering means a swap never
    // waits on image decode.
    const pieceFlash = (i: number, u: number, tc: number) => {
      const a = pieceFlashARefs.current[i]
      const b = pieceFlashBRefs.current[i]
      if (!a || !b) return
      const showEl = pieceFlip[i] === 0 ? a : b
      const prepEl = pieceFlip[i] === 0 ? b : a
      showEl.style.visibility = 'visible'
      prepEl.style.visibility = 'hidden'
      const shard = pieceShardRefs.current[i]
      if (shard) shard.style.visibility = 'hidden'
      pieceFlip[i] = 1 - pieceFlip[i]
      pieceStep[i]++
      prepEl.src = pieceStream[i][pieceStep[i] % pieceStream[i].length]
      pieceNextFlashAt[i] = tc + lerp(PIECE_DWELL_START, PIECE_DWELL_END, u) * TICK_MS
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
      const showEl = pieceFlip[i] === 0 ? pieceFlashARefs.current[i] : pieceFlashBRefs.current[i]
      const otherEl = pieceFlip[i] === 0 ? pieceFlashBRefs.current[i] : pieceFlashARefs.current[i]
      if (showEl) {
        showEl.src = dest
        showEl.style.visibility = 'visible'
      }
      if (otherEl) otherEl.style.visibility = 'hidden'
      const shard = pieceShardRefs.current[i]
      if (shard) shard.style.visibility = 'hidden'
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
      // RAF pauses in hidden tabs — shift the clock over big gaps so the cut
      // resumes where it paused instead of skipping straight to the landing.
      if (now - lastTick > 500) start += now - lastTick
      lastTick = now
      const tc = now - start // schedule clock

      // ── phase A: the cut on the big rectangle, flying to the mosaic ──
      if (tc < splitTime) {
        let rect: Rect
        if (splitMode && mosaic) {
          rect = mosaic // screen-fixed — no measuring needed
        } else {
          rect = syncRect(mediaEls[0], overlay, lastRect)
        }
        const scale0 = startW / rect.width
        const dx0 = vw / 2 - (rect.left + rect.width / 2)
        const dy0 = vh / 2 - (rect.top + rect.height / 2)
        // The flight completes exactly at the split (or, in single mode, at
        // the end of the cut) — the pieces launch from rest.
        const p = easeInOutCubic(clamp01(tc / splitTime))
        const s = lerp(scale0, 1, p)
        // Entry: ease in from ENTRY_SCALE/ENTRY_OPACITY on top of the FLIP
        // transform (multiplied into the scale, so both animations compose).
        const te = clamp01(tc / ENTRY_MS)
        const entry = 1 - Math.pow(1 - te, 3)
        overlay.style.opacity = te < 1 ? lerp(ENTRY_OPACITY, 1, entry).toFixed(3) : '1'
        overlay.style.transform = `translate(${lerp(dx0, 0, p)}px, ${lerp(dy0, 0, p)}px) scale(${s * lerp(ENTRY_SCALE, 1, entry)})`
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
        }
        drawAllMirrors()
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── phase B: the pieces fly, still supercutting (split mode only) ──
      if (splitMode && tc < fallEnd) {
        if (!splitDone) split()
        for (let i = 0; i < PIECE_COUNT; i++) {
          const u = clamp01((tc - splitTime - i * PIECE_STAGGER_MS) / FALL_MS)
          pieceTransform(i, u)
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
            // is the meta text fading in right at touchdown).
            setIntroLandedCount(i + 1)
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
        // The hero's 50% -> 100% fade fires only now — once every piece is
        // down — well after the split, in the same beat as the card text.
        setIntroHeroReveal(true)
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
              setIntroLandedCount(i + 1)
              startMirrorOn(i, pieceCanvasRefs.current[i], targets[i])
            }
          }
        } else {
          // Clock jumps can skip schedule entries — force the landing frame
          // so the card never resolves showing the wrong one.
          if (frameShown !== N - 1) showFrame(N - 1)
          setIntroLandedCount(1) // single mode: reveal card one at touchdown
          overlay.style.borderRadius = `${CARD_RADIUS}px`
          overlay.style.transform = 'none'
        }
        finish(splitMode ? 'supercut_split' : 'supercut')
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
          style={{ visibility: 'hidden', zIndex: 1 }}
        />
        {/* Halftone screen — dot texture riding the flashes */}
        <div className="absolute inset-0" style={{ ...halftoneStyle, zIndex: 2 }} />
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
            style={{ visibility: 'hidden', zIndex: 3 }}
          />
          <div
            ref={(el) => {
              pieceHalftoneRefs.current[i] = el
            }}
            className="absolute inset-0"
            style={{ ...halftoneStyle, zIndex: 4 }}
          />
        </div>
      ))}
    </div>
  )
}

