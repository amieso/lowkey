'use client'

import { useCallback, useRef, useState } from 'react'
import { Chapter } from '@/types/video'

interface MobileScrubBarProps {
  chapters: Chapter[]
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onSeekStart: () => void
  onSeekEnd: () => void
}

/**
 * Plain continuous scrub bar for the stacked mobile layout — chapter *navigation*
 * lives in the vertical list below, so this only carries position, with hairline
 * ticks marking where the chapter boundaries fall.
 *
 * Unlike the desktop bars this is pointer-driven with capture, so a finger drag
 * keeps scrubbing after it slides off the 4px track. The hit area is padded out
 * to 24px tall while the track stays thin.
 */
export function MobileScrubBar({
  chapters,
  currentTime,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: MobileScrubBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const seekToX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(frac * duration)
  }, [duration, onSeek])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsScrubbing(true)
    onSeekStart()
    seekToX(event.clientX)
  }, [onSeekStart, seekToX])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    event.stopPropagation()
    seekToX(event.clientX)
  }, [isScrubbing, seekToX])

  const endScrub = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setIsScrubbing(false)
    onSeekEnd()
  }, [isScrubbing, onSeekEnd])

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0

  return (
    <div
      className="relative flex h-6 cursor-pointer touch-none items-center"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endScrub}
      onPointerCancel={endScrub}
    >
      <div
        ref={trackRef}
        className={`relative w-full rounded-full bg-white/15 transition-all duration-150 ${
          isScrubbing ? 'h-1.5' : 'h-1'
        }`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Chapter boundaries — skip index 0, which sits under the left cap */}
        {duration > 0 && chapters.slice(1).map((chapter) => (
          <div
            key={chapter.id}
            className="absolute inset-y-0 w-px bg-black/50"
            style={{ left: `${(chapter.startTime / duration) * 100}%` }}
            aria-hidden
          />
        ))}

        <div
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-150 ${
            isScrubbing ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'
          }`}
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
