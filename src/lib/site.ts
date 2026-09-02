// Canonical public origin. Production is pinned so a stale or missing
// NEXT_PUBLIC_SITE_URL can't leak a localhost origin into OG/Twitter image
// URLs, MCP links, or email assets (which is exactly what happened once).
const PRODUCTION_URL = 'https://lowkey.so'

function resolveSiteUrl(): string {
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_URL
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && !/localhost|127\.0\.0\.1/.test(configured) ) return configured.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return configured?.replace(/\/$/, '') || PRODUCTION_URL
}

export const SITE_URL = resolveSiteUrl()

/**
 * Mux thumbnail cropped to the 1.91:1 social-card frame. Landscape videos get
 * a smart crop (trims a sliver top/bottom); portrait and square videos are
 * padded so the whole frame survives instead of being gutted by the crop.
 */
export function socialImageFor(thumbnailUrl: string, aspectRatio: string): string {
  const base = thumbnailUrl.split('?')[0]
  const fit = aspectRatio === '16:9' ? 'smartcrop' : 'pad'
  return `${base}?time=5&width=1200&height=630&fit_mode=${fit}`
}
