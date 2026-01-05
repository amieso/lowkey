'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { Video } from '@/types/video'
import { getSegmentsForVideo } from '@/data/segments'

interface BreakdownModeProps {
  video: Video
  currentTime: number
  onSeek?: (time: number) => void
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function BreakdownMode({ video, currentTime, onSeek }: BreakdownModeProps) {
  const segments = getSegmentsForVideo(video.id)
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const prevActiveIdRef = useRef<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0)
  }

  const activeSegment = useMemo(() => {
    return segments.find(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    ) || segments[0]
  }, [segments, currentTime])

  useEffect(() => {
    if (activeSegment && activeSegment.id !== prevActiveIdRef.current) {
      prevActiveIdRef.current = activeSegment.id
      const el = segmentRefs.current.get(activeSegment.id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [activeSegment])

  if (segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted">
        <p className="text-sm">No breakdown available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2.5">
          {video.company}
        </p>
        <h2 className="text-xl font-medium text-foreground leading-tight tracking-tight">
          Video Breakdown
        </h2>
      </div>

      {/* Scrollable segments list */}
      <div className="relative flex-1 min-h-0 -mx-6">
        {/* Top fade - only visible when scrolled */}
        {isScrolled && (
          <div
            className="absolute top-0 left-0 right-0 h-12 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(23,23,23,1) 0%, rgba(23,23,23,0) 100%)',
            }}
          />
        )}

        <div
          className="h-full overflow-y-auto scrollbar-hide px-[10px]"
          onScroll={handleScroll}
        >
          <div className="flex flex-col gap-1.5 pt-4 pb-32">
          {segments.map((seg) => {
            const isActive = activeSegment?.id === seg.id
            return (
              <div
                key={seg.id}
                ref={(el) => {
                  if (el) segmentRefs.current.set(seg.id, el)
                }}
                onClick={() => onSeek?.(seg.startTime)}
                className={`rounded-lg py-4 pl-4 pr-5 transition-colors cursor-pointer hover:bg-white/5 ${
                  isActive ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono w-10 shrink-0 ${
                    isActive ? 'text-foreground' : 'text-muted/50'
                  }`}>
                    {formatTime(seg.startTime)}
                  </span>
                  <h3 className={`text-sm font-medium ${
                    isActive ? 'text-foreground' : 'text-muted'
                  }`}>
                    {seg.title}
                  </h3>
                </div>
                <p className={`text-sm leading-relaxed mt-2 ml-[52px] ${
                  isActive ? 'text-muted' : 'text-muted/60'
                }`}>
                  {seg.description}
                </p>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
