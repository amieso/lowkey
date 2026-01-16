'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { Video, STYLE_LABELS, PURPOSE_LABELS } from '@/types/video'
import { formatDuration } from '@/lib/utils'

interface CompanyVideoCardProps {
  video: Video
  onSelect: (video: Video) => void
}

export function CompanyVideoCard({ video, onSelect }: CompanyVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !video.videoUrl) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(video.videoUrl)
      hls.attachMedia(videoEl)
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = video.videoUrl
    }
  }, [video.videoUrl])

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {})
  }

  const handleMouseLeave = () => {
    const videoEl = videoRef.current
    if (videoEl) {
      videoEl.pause()
      videoEl.currentTime = 0
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(video)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(video)
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer"
    >
      {/* Video thumbnail container */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface mb-3">
        {/* Video element */}
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Duration badge - bottom right */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded text-xs text-white font-mono">
          {formatDuration(video.duration)}
        </div>

        {/* Style badge - top left */}
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-surface/90 backdrop-blur-sm rounded-full text-xs text-foreground border border-white/10">
          {STYLE_LABELS[video.style]}
        </div>
      </div>

      {/* Card info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground group-hover:text-white transition-colors line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{PURPOSE_LABELS[video.purpose]}</span>
          <span>·</span>
          <span>{new Date(video.publishedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    </article>
  )
}
