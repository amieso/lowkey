'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { Video } from '@/types/video'
import { formatDuration } from '@/lib/utils'
import { CompanyLink } from '@/components/ui/company-link'

function toProperCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface VideoCardProps {
  video: Video
  onSelect: (video: Video) => void
  disablePlayback?: boolean
}

export function VideoCard({ video, onSelect, disablePlayback = false }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isGhost = !video.videoUrl

  useEffect(() => {
    if (isGhost || disablePlayback) return

    const videoEl = videoRef.current
    if (!videoEl) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(video.videoUrl)
      hls.attachMedia(videoEl)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {})
      })
      return () => hls.destroy()
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      videoEl.src = video.videoUrl
      videoEl.play().catch(() => {})
    }
  }, [video.videoUrl, isGhost, disablePlayback])

  const handleClick = () => {
    if (!isGhost) {
      onSelect(video)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isGhost) {
      e.preventDefault()
      onSelect(video)
    }
  }

  return (
    <article
      role={isGhost ? undefined : 'button'}
      tabIndex={isGhost ? undefined : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group ${isGhost ? '' : 'cursor-pointer'}`}
    >
      {/* Video container - always 16:9 */}
      <div className="relative aspect-video w-full rounded-[6px] group-hover:ring-1 group-hover:ring-white/[0.08]">
        <div className="absolute inset-0 overflow-hidden rounded-[6px] bg-surface isolate">
          {isGhost ? (
            // Ghost card placeholder
            <div className="absolute inset-0 bg-[#1a1a1a]" />
          ) : disablePlayback ? (
            // Static thumbnail for locked cards
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover rounded-[6px]"
            />
          ) : (
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover rounded-[6px]"
            />
          )}

          {/* Dark overlay with info on hover */}
          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-5 pointer-events-none">
            {/* Title at top */}
            <div className="flex items-start justify-between gap-12">
              <h3 className="text-2xl font-light text-white tracking-tight line-clamp-2">{video.title}</h3>
            </div>

            {/* Bottom row: tags left, company right */}
            <div className="flex items-end justify-between">
              <div className="flex gap-2">
                <span className="text-xs px-3 py-1 border border-white/40 rounded-full text-white">{toProperCase(video.style)}</span>
                <span className="text-xs px-3 py-1 border border-white/40 rounded-full text-white">{toProperCase(video.productType)}</span>
              </div>
              <CompanyLink
                company={video.company}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-white/70 tracking-widest uppercase font-mono hover:text-white transition-colors"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Info below card */}
      <div className="flex items-center justify-between pt-[14px] pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <CompanyLink
            company={video.company}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted shrink-0 hover:text-foreground transition-colors"
          />
          <span className="text-xs text-foreground truncate">{video.title}</span>
        </div>
        {isGhost ? (
          <span className="text-xs text-muted shrink-0 font-mono">Soon</span>
        ) : (
          <span className="text-xs text-muted shrink-0 font-mono">{formatDuration(video.duration)}</span>
        )}
      </div>
    </article>
  )
}
