import { getMetrics, formatCount } from '@/lib/metrics'

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  )
}

function ViewsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 13h3v8H3v-8zm7-6h3v14h-3V7zm7 3h3v11h-3V10z" />
    </svg>
  )
}

/**
 * X engagement stats for a video, read from the build-time metrics cache.
 * Renders nothing when there are no metrics (no token, new video, etc.).
 *
 * - `pill`: roomy badge for the expanded modal (likes · replies · views)
 * - `inline`: compact likes-only for the grid card footer
 */
export function VideoMetrics({
  sourceUrl,
  variant = 'pill',
  className = '',
}: {
  sourceUrl?: string
  variant?: 'pill' | 'inline'
  className?: string
}) {
  const m = getMetrics(sourceUrl)
  if (!m || (m.likes === 0 && m.replies === 0 && m.impressions === 0)) return null

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 text-xs text-muted shrink-0 font-mono ${className}`}>
        {m.impressions > 0 && (
          <span className="inline-flex items-center gap-1">
            <ViewsIcon className="w-3 h-3" />
            {formatCount(m.impressions)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <HeartIcon className="w-3 h-3" />
          {formatCount(m.likes)}
        </span>
      </span>
    )
  }

  return (
    <div
      className={`w-fit inline-flex items-center gap-3 rounded px-2 py-1 bg-black/45 backdrop-blur-sm text-[11px] text-white/85 font-mono ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        <HeartIcon className="w-3 h-3" />
        {formatCount(m.likes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <ReplyIcon className="w-3 h-3" />
        {formatCount(m.replies)}
      </span>
      <span className="inline-flex items-center gap-1">
        <ViewsIcon className="w-3 h-3" />
        {formatCount(m.impressions)}
      </span>
    </div>
  )
}
