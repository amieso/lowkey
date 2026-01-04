'use client'

import { useRef, useState } from 'react'
import { Video } from '@/types/video'
import { formatDuration } from '@/lib/utils'

interface VideoCardProps {
  video: Video
  onSelect: (video: Video) => void
}

export function VideoCard({ video, onSelect }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const handleClick = () => {
    onSelect(video)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(video)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer"
    >
      {/* Video container - always 16:9 */}
      <div className="relative overflow-hidden bg-surface aspect-video w-full rounded-sm">
        <video
          ref={videoRef}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Info below card */}
      <div className="flex items-center justify-between pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted shrink-0">{video.company}</span>
          <span className="text-xs text-foreground truncate">{video.title}</span>
        </div>
        <span className="text-xs text-muted shrink-0 font-mono">{formatDuration(video.duration)}</span>
      </div>
    </article>
  )
}
