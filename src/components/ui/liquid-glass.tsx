'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Liquid-glass surface after aave.com/design/building-glass-for-the-web:
// a canvas-generated displacement map (R = horizontal push, G = vertical push,
// neutral 0.5 elsewhere) drives an SVG feDisplacementMap over the element's
// backdrop, split per color channel for a faint chromatic fringe at the rim.
// backdrop-filter: url(#...) only works in Chromium; elsewhere we fall back to
// a plain blur/saturate glass, and the specular highlights are shared CSS.

function makeDisplacementMap(
  w: number,
  h: number,
  radius: number,
  depth: number
): string | null {
  if (w < 2 || h < 2 || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = w / 2
  const cy = h / 2
  const r = Math.min(radius, cx, cy)
  const ex = cx - r
  const ey = cy - r

  // signed distance to the rounded-rect lens; negative inside
  const sdf = (x: number, y: number) => {
    const qx = Math.abs(x - cx) - ex
    const qy = Math.abs(y - cy) - ey
    return (
      Math.min(Math.max(qx, qy), 0) +
      Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
      r
    )
  }

  const img = ctx.createImageData(w, h)
  const data = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const d = sdf(x + 0.5, y + 0.5)
      let nx = 0
      let ny = 0
      if (d < 0 && d > -depth) {
        // 0 deep inside the lens, 1 right at the rim; squared for curvature
        const t = 1 + d / depth
        const mag = t * t
        // numeric SDF gradient = outward normal
        const gx = sdf(x + 1.5, y + 0.5) - sdf(x - 0.5, y + 0.5)
        const gy = sdf(x + 0.5, y + 1.5) - sdf(x + 0.5, y - 0.5)
        const len = Math.hypot(gx, gy) || 1
        nx = (gx / len) * mag
        ny = (gy / len) * mag
      }
      data[i] = Math.round(128 + nx * 127)
      data[i + 1] = Math.round(128 + ny * 127)
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

const CHANNEL_MATRIX = {
  r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
}

interface LiquidGlassProps {
  /** Corner radius of the lens; defaults to a pill (half the height) */
  radius?: number
  /** Width in px of the refracting band along the rim; defaults to ~22% of height */
  depth?: number
  /** Max displacement in px at the rim; defaults to 2.5x depth */
  strength?: number
  /** Extra displacement for the red/blue channels (chromatic fringe) */
  chroma?: number
  /** Scales the specular highlights and rim — dial down on large surfaces */
  intensity?: number
  /** Base fill under the glass; needed for legibility over bright video */
  tint?: string
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function LiquidGlass({
  radius,
  depth: depthProp,
  strength: strengthProp,
  chroma = 6,
  intensity = 1,
  tint,
  className,
  style,
  children,
}: LiquidGlassProps) {
  const rawId = useId()
  const filterId = `liquid-glass-${rawId.replace(/[^a-zA-Z0-9-]/g, '')}`
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [map, setMap] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // SVG filters in backdrop-filter are Chromium-only; Safari and Firefox
    // parse url() but render nothing, so UA-gate rather than CSS.supports
    const isChromium =
      /Chrom(e|ium)|Edg\//.test(navigator.userAgent) &&
      CSS.supports('backdrop-filter', 'url(#f)')
    setSupported(isChromium)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.target.getBoundingClientRect()
      setDims((prev) => {
        const w = Math.round(width)
        const h = Math.round(height)
        return prev?.w === w && prev?.h === h ? prev : { w, h }
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Scale refraction to the element: a 28px pill needs a much narrower rim band
  // than a 64px one, otherwise the whole surface is displaced and reads as smear.
  const depth =
    depthProp ?? (dims ? Math.max(4, Math.min(12, dims.h * 0.22)) : 8)
  const strength = strengthProp ?? depth * 2.5

  // Debounced: on a surface that animates its size (the chapter timeline
  // collapsing, say) the ResizeObserver fires every frame, and regenerating a
  // per-pixel map that often is far too expensive. The previous map keeps
  // rendering meanwhile — slightly stale refraction is invisible mid-transition.
  useEffect(() => {
    if (!dims || !supported) return
    const t = window.setTimeout(() => {
      setMap(makeDisplacementMap(dims.w, dims.h, radius ?? dims.h / 2, depth))
    }, 120)
    return () => window.clearTimeout(t)
  }, [dims, supported, radius, depth])

  const r = radius ?? (dims ? dims.h / 2 : 9999)
  const active = supported && map !== null && dims !== null
  const backdrop = active
    ? `url(#${filterId}) brightness(1.06) saturate(1.35)`
    : 'blur(3px) brightness(1.06) saturate(1.35)'

  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      style={{
        borderRadius: r,
        background: tint,
        backdropFilter: backdrop,
        WebkitBackdropFilter: active ? undefined : backdrop,
        boxShadow: [
          // edge highlight ring
          `inset 0 0 0 1px rgba(255,255,255,${0.1 * intensity})`,
          // specular: light from the top
          `inset 0 1px 0 0 rgba(255,255,255,${0.22 * intensity})`,
          `inset 0 -1px 1px 0 rgba(255,255,255,${0.05 * intensity})`,
          // inner glow
          `inset 0 0 8px 0 rgba(255,255,255,${0.07 * intensity})`,
          // lift off the backdrop
          `0 6px 16px rgba(0,0,0,${0.18 * intensity})`,
        ].join(', '),
        ...style,
      }}
    >
      {active && dims && (
        <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
          <defs>
            <filter
              id={filterId}
              x="0"
              y="0"
              width={dims.w}
              height={dims.h}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={map!}
                x="0"
                y="0"
                width={dims.w}
                height={dims.h}
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={strength + chroma}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispR"
              />
              <feColorMatrix
                in="dispR"
                type="matrix"
                values={CHANNEL_MATRIX.r}
                result="chanR"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={strength}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispG"
              />
              <feColorMatrix
                in="dispG"
                type="matrix"
                values={CHANNEL_MATRIX.g}
                result="chanG"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={Math.max(strength - chroma, 0)}
                xChannelSelector="R"
                yChannelSelector="G"
                result="dispB"
              />
              <feColorMatrix
                in="dispB"
                type="matrix"
                values={CHANNEL_MATRIX.b}
                result="chanB"
              />
              <feBlend in="chanR" in2="chanG" mode="screen" result="blendRG" />
              <feBlend in="blendRG" in2="chanB" mode="screen" />
            </filter>
          </defs>
        </svg>
      )}
      {children}
    </div>
  )
}
