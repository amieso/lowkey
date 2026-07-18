'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Chapter } from '@/types/video'
import { LiquidGlass } from '@/components/ui/liquid-glass'

interface ChapterTimelineProps {
  chapters: Chapter[]
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onSeekStart: () => void
  onSeekEnd: () => void
  /** Shrunken idle state: thin fill bars, no labels/ticks/caret. */
  compact?: boolean
}

const TICK_COUNT = 48

export function ChapterTimeline({
  chapters,
  currentTime,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
  compact = false,
}: ChapterTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLDivElement | null)[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const getSegmentEndTime = (index: number) => {
    return chapters[index + 1]?.startTime ?? duration
  }

  const getSegmentWidth = (index: number) => {
    const start = chapters[index].startTime
    const end = getSegmentEndTime(index)
    return ((end - start) / duration) * 100
  }

  // Fraction of the chapter that has played (0..1)
  const getSegmentFill = (index: number) => {
    const start = chapters[index].startTime
    const end = getSegmentEndTime(index)
    if (currentTime <= start) return 0
    if (currentTime >= end) return 1
    return (currentTime - start) / (end - start)
  }

  const activeIndex = (() => {
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) return i
    }
    return 0
  })()

  // Map a clientX to a time by walking the actual pill rects, so the
  // flex gaps between pills never skew the seek position
  const getTimeFromX = useCallback((clientX: number) => {
    if (duration <= 0) return null
    const rects = pillRefs.current
      .map((el, i) => (el ? { rect: el.getBoundingClientRect(), index: i } : null))
      .filter((r): r is { rect: DOMRect; index: number } => r !== null)
    if (rects.length === 0) return null

    for (const { rect, index } of rects) {
      if (clientX <= rect.right) {
        const start = chapters[index].startTime
        const end = chapters[index + 1]?.startTime ?? duration
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        return start + frac * (end - start)
      }
    }
    return duration
  }, [chapters, duration])

  const seekTo = useCallback((clientX: number) => {
    const time = getTimeFromX(clientX)
    if (time !== null) {
      onSeek(time)
    }
  }, [getTimeFromX, onSeek])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    onSeekStart()
    seekTo(e.clientX)
  }, [onSeekStart, seekTo])

  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => seekTo(e.clientX)
    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      onSeekEnd()
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, seekTo, onSeekEnd])

  return (
    <div className="relative select-none">
      {/* Chapter pills, seated in a glass trough. One lens behind the whole row
          rather than one per pill — N filters over a row that animates its
          height would be far too much per-pixel work. */}
      <LiquidGlass
        radius={compact ? 3 : 12}
        intensity={compact ? 0 : 0.7}
        className="transition-all duration-300 ease-out"
      >
      <div
        ref={containerRef}
        className="relative flex gap-1.5 cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {chapters.map((chapter, index) => {
          const isActive = index === activeIndex
          const fill = getSegmentFill(index)

          return (
            <div
              key={chapter.id}
              ref={(el) => { pillRefs.current[index] = el }}
              // 3px fully rounds the 6px compact bar; using it instead of
              // rounded-full (9999px) keeps the radius transition in visible
              // range so it animates in step with the height
              className={`relative flex items-center justify-center transition-all duration-300 ease-out ${
                compact ? 'h-1.5 rounded-[3px]' : 'h-10 rounded-xl'
              } ${
                isActive
                  ? `bg-white/30 ${compact ? '' : 'scale-y-[1.08]'}`
                  : hoveredIndex === index
                    ? 'bg-white/20'
                    : 'bg-white/10'
              }`}
              style={{ width: `${getSegmentWidth(index)}%` }}
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Compact fill — the played portion, like a classic thin bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 rounded-[3px] bg-white transition-opacity duration-300 pointer-events-none ${
                  compact ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ width: `${fill * 100}%` }}
              />

              <span
                className={`text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis px-2 transition-opacity duration-200 ${
                  isActive ? 'text-white' : 'text-white/70'
                } ${compact ? 'opacity-0' : 'opacity-100'}`}
              >
                {chapter.title}
              </span>

              {/* Playhead: vertical line through the active pill with a caret on top */}
              {isActive && !compact && (
                <div
                  className="absolute -top-[9px] -bottom-px w-px pointer-events-none"
                  style={{ left: `calc(${fill * 100}% - 0.5px)` }}
                >
                  <div className="absolute inset-0 bg-white" />
                  <div
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: '7px solid white',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      </LiquidGlass>

      {/* Tick ruler */}
      <div
        className={`flex justify-between px-px overflow-hidden transition-all duration-300 ease-out ${
          compact ? 'mt-0 h-0 opacity-0' : 'mt-2 h-[5px] opacity-100'
        }`}
        aria-hidden
      >
        {Array.from({ length: TICK_COUNT }, (_, i) => (
          <div key={i} className="w-px h-full bg-white/30" />
        ))}
      </div>
    </div>
  )
}
