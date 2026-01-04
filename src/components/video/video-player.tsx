'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  src: string
  poster: string
  aspectRatio?: '16:9' | '9:16'
}

export function VideoPlayer({ src, poster, aspectRatio = '16:9' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      togglePlay()
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-surface',
        aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
      )}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        playsInline
        className="h-full w-full object-contain bg-black"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      />
    </div>
  )
}
