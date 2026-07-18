'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { videos } from '@/data/videos'

/**
 * /grid-light — Porsche-teaser entry effect mapped onto the video grid.
 *
 * Pure black. A point light sweeps across the grid; only the card edges whose
 * outward normal *faces* the light glint, so a tight specular hot spot rides the
 * leading edge and traces around the rounded corners. Each edge ignites then
 * decays in the wake — contours linger and fade like a real light raking a body
 * line. Thumbnails wipe on behind it. Sandbox with a live control panel — tune
 * the dials, then "Copy settings" to lift the values back into code.
 *
 * Real DOM grid (matches the homepage, real thumbnails); a canvas overlay
 * measures each card's rounded-rect and renders directional rim light plus a
 * per-point afterglow buffer. The RAF reads the dials from a ref each frame, so
 * sliders apply live.
 */

const CORNER_R = 12 // matches rounded-xl
const STEP = 5 // px — perimeter sampling density
const REVEAL_LEAD = 60 // px — content starts revealing just ahead of the light
const REVEAL_SPAN = 220 // px — distance over which a card fades up

type PathKind = 'arc' | 'leftRight' | 'rightLeft' | 'diagonal'

interface Dials {
  sweepMs: number
  glowHalflife: number // s — afterglow trail length
  rimPower: number // soft rim falloff exponent
  rimWeight: number // how much of the full facing edge shows
  specPower: number // tightness of the travelling hot spot
  influence: number // px — light reach
  lineWidth: number
  bloomTight: number
  bloomWide: number
  path: PathKind
  loop: boolean
}

const DEFAULTS: Dials = {
  sweepMs: 2800,
  glowHalflife: 0.34,
  rimPower: 2.2,
  rimWeight: 0.55,
  specPower: 9,
  influence: 540,
  lineWidth: 1.4,
  bloomTight: 3,
  bloomWide: 11,
  path: 'arc',
  loop: false,
}

const CARDS = videos.filter((v) => v.thumbnailUrl).slice(0, 15)

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

type Pt = { x: number; y: number; nx: number; ny: number }
type Card = { cx: number; cy: number; perim: Pt[]; glow: Float32Array; max: number }

function roundedPerimeter(x: number, y: number, w: number, h: number, r: number): Pt[] {
  const pts: Pt[] = []
  const line = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.round(len / STEP))
    for (let i = 0; i < n; i++) {
      const t = i / n
      pts.push({ x: lerp(x0, x1, t), y: lerp(y0, y1, t), nx, ny })
    }
  }
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / STEP))
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n)
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) })
    }
  }
  line(x + r, y, x + w - r, y, 0, -1)
  arc(x + w - r, y + r, -Math.PI / 2, 0)
  line(x + w, y + r, x + w, y + h - r, 1, 0)
  arc(x + w - r, y + h - r, 0, Math.PI / 2)
  line(x + w - r, y + h, x + r, y + h, 0, 1)
  arc(x + r, y + h - r, Math.PI / 2, Math.PI)
  line(x, y + h - r, x, y + r, -1, 0)
  arc(x + r, y + r, Math.PI, Math.PI * 1.5)
  return pts
}

function lightAt(u: number, path: PathKind, vw: number, vh: number) {
  switch (path) {
    case 'leftRight':
      return { x: lerp(-0.1 * vw, 1.1 * vw, u), y: vh * 0.5, dir: 1 }
    case 'rightLeft':
      return { x: lerp(1.1 * vw, -0.1 * vw, u), y: vh * 0.5, dir: -1 }
    case 'diagonal':
      return { x: lerp(-0.1 * vw, 1.1 * vw, u), y: lerp(-0.05 * vh, 1.05 * vh, u), dir: 1 }
    case 'arc':
    default:
      return { x: lerp(-0.1 * vw, 1.1 * vw, u), y: vh * (0.34 + 0.34 * u + 0.1 * Math.sin(u * Math.PI)), dir: 1 }
  }
}

export default function GridLightPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef(0)
  const [done, setDone] = useState(false)

  const [dials, setDials] = useState<Dials>(DEFAULTS)
  const dialsRef = useRef(dials)
  dialsRef.current = dials
  const doneRef = useRef(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [toast, setToast] = useState('')

  const play = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setDone(false)
    doneRef.current = false

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const vw = window.innerWidth
    const vh = window.innerHeight
    canvas.width = vw * dpr
    canvas.height = vh * dpr
    canvas.style.width = `${vw}px`
    canvas.style.height = `${vh}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cards: Card[] = []
    cardRefs.current.forEach((el) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const perim = roundedPerimeter(r.x, r.y, r.width, r.height, CORNER_R)
      cards.push({ cx: r.x + r.width / 2, cy: r.y + r.height / 2, perim, glow: new Float32Array(perim.length), max: 0 })
    })

    const start = performance.now()
    let last = start
    const tick = (now: number) => {
      const d = dialsRef.current
      const t = Math.min((now - start) / d.sweepMs, 1)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const decay = Math.pow(0.5, dt / d.glowHalflife)
      const L = lightAt(easeInOut(t), d.path, vw, vh)

      ctx.clearRect(0, 0, vw, vh)
      ctx.lineWidth = d.lineWidth
      ctx.lineCap = 'round'

      for (const card of cards) {
        const inRange = Math.hypot(L.x - card.cx, L.y - card.cy) < d.influence + 280
        if (!inRange && card.max < 0.02) continue
        const p = card.perim
        const g = card.glow
        let cardMax = 0
        for (let i = 0; i < p.length; i++) {
          const a = p[i]
          let target = 0
          if (inRange) {
            const dx = L.x - a.x
            const dy = L.y - a.y
            const dist = Math.hypot(dx, dy)
            if (dist < d.influence) {
              const facing = (a.nx * dx + a.ny * dy) / (dist || 1)
              if (facing > 0) {
                let fall = 1 - dist / d.influence
                fall *= fall
                target = (Math.pow(facing, d.rimPower) * d.rimWeight + Math.pow(facing, d.specPower)) * fall
              }
            }
          }
          const s = target > g[i] ? target : g[i] * decay
          g[i] = s
          if (s > cardMax) cardMax = s
          if (s < 0.015) continue
          const b = p[(i + 1) % p.length]
          ctx.strokeStyle = `rgba(255,255,255,${s > 1 ? 1 : s})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        card.max = cardMax
      }

      cardRefs.current.forEach((el, idx) => {
        const card = cards[idx]
        if (!el || !card) return
        const passed = L.dir >= 0 ? L.x - (card.cx - REVEAL_LEAD) : card.cx + REVEAL_LEAD - L.x
        el.style.opacity = String(clamp01(passed / REVEAL_SPAN))
      })

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        cardRefs.current.forEach((el) => el && (el.style.opacity = '1'))
        setDone(true)
        doneRef.current = true
        if (dialsRef.current.loop) setTimeout(() => doneRef.current && play(), 900)
      }
    }
    cardRefs.current.forEach((el) => el && (el.style.opacity = '0'))
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    play()
    return () => cancelAnimationFrame(rafRef.current)
  }, [play])

  const set = <K extends keyof Dials>(k: K, v: Dials[K]) => setDials((p) => ({ ...p, [k]: v }))

  const copySettings = () => {
    const d = dials
    const text = [
      `sweepMs: ${d.sweepMs},`,
      `glowHalflife: ${d.glowHalflife},`,
      `rimPower: ${d.rimPower},`,
      `rimWeight: ${d.rimWeight},`,
      `specPower: ${d.specPower},`,
      `influence: ${d.influence},`,
      `lineWidth: ${d.lineWidth},`,
      `bloomTight: ${d.bloomTight},`,
      `bloomWide: ${d.bloomWide},`,
      `path: '${d.path}',`,
    ].join('\n')
    navigator.clipboard?.writeText(text)
    setToast('Settings copied')
    setTimeout(() => setToast(''), 1400)
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div className="absolute inset-0 px-4 py-20 md:px-8">
        <Grid>
          {CARDS.map((v, i) => (
            <div
              key={v.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"
              style={{ opacity: 0, transition: 'opacity 700ms ease-out' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnailUrl} alt={v.title} className="h-full w-full object-cover" draggable={false} />
            </div>
          ))}
        </Grid>
      </div>

      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: done ? 0 : 1,
          background: 'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: done ? 0 : 1,
          filter: `drop-shadow(0 0 ${dials.bloomTight}px rgba(255,255,255,0.5)) drop-shadow(0 0 ${dials.bloomWide}px rgba(255,255,255,0.28))`,
        }}
      />

      <div
        className="absolute left-1/2 top-[44px] h-9 w-9 -translate-x-1/2 transition-opacity duration-700"
        style={{ opacity: done ? 1 : 0 }}
      >
        <EyeMark />
      </div>

      {/* Control panel */}
      {panelOpen ? (
        <div className="absolute left-4 top-4 z-10 w-72 rounded-2xl bg-black/70 p-4 text-white ring-1 ring-white/15 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Light dials</span>
            <button onClick={() => setPanelOpen(false)} className="text-xs text-white/50 hover:text-white">
              hide
            </button>
          </div>

          <div className="mb-3 flex gap-1">
            {(['arc', 'leftRight', 'rightLeft', 'diagonal'] as PathKind[]).map((p) => (
              <button
                key={p}
                onClick={() => set('path', p)}
                className={`flex-1 rounded-md px-1.5 py-1 text-[10px] transition-colors ${
                  dials.path === p ? 'bg-white text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {p === 'leftRight' ? 'L→R' : p === 'rightLeft' ? 'R→L' : p}
              </button>
            ))}
          </div>

          <Slider label="Sweep" unit="ms" min={800} max={6000} step={100} value={dials.sweepMs} onChange={(v) => set('sweepMs', v)} />
          <Slider label="Afterglow" unit="s" min={0.05} max={1.2} step={0.01} value={dials.glowHalflife} onChange={(v) => set('glowHalflife', v)} />
          <Slider label="Influence" unit="px" min={200} max={1000} step={10} value={dials.influence} onChange={(v) => set('influence', v)} />
          <Slider label="Spec tightness" min={2} max={24} step={0.5} value={dials.specPower} onChange={(v) => set('specPower', v)} />
          <Slider label="Rim power" min={0.5} max={6} step={0.1} value={dials.rimPower} onChange={(v) => set('rimPower', v)} />
          <Slider label="Rim weight" min={0} max={1.5} step={0.05} value={dials.rimWeight} onChange={(v) => set('rimWeight', v)} />
          <Slider label="Line width" unit="px" min={0.5} max={3} step={0.1} value={dials.lineWidth} onChange={(v) => set('lineWidth', v)} />
          <Slider label="Bloom tight" unit="px" min={0} max={10} step={0.5} value={dials.bloomTight} onChange={(v) => set('bloomTight', v)} />
          <Slider label="Bloom wide" unit="px" min={0} max={30} step={1} value={dials.bloomWide} onChange={(v) => set('bloomWide', v)} />

          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-white/70">
              <input type="checkbox" checked={dials.loop} onChange={(e) => set('loop', e.target.checked)} />
              loop
            </label>
            <button onClick={play} className="flex-1 rounded-md bg-white/15 px-2 py-1.5 text-xs hover:bg-white/25">
              Replay
            </button>
            <button onClick={() => setDials(DEFAULTS)} className="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20">
              Reset
            </button>
          </div>
          <button onClick={copySettings} className="mt-2 w-full rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20">
            Copy settings
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute left-4 top-4 z-10 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white ring-1 ring-white/15 backdrop-blur"
        >
          dials
        </button>
      )}

      {!panelOpen && (
        <button
          onClick={play}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/15"
        >
          Replay
        </button>
      )}

      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black">
          {toast}
        </div>
      )}
    </div>
  )
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  unit?: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="tabular-nums text-white/90">
          {value}
          {unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
      />
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
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
