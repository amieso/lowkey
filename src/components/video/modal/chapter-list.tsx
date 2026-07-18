'use client'

import { Chapter } from '@/types/video'
import { formatDuration } from '@/lib/utils'

interface ChapterListProps {
  chapters: Chapter[]
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

/**
 * Vertical chapter list for the stacked mobile layout. The horizontal pill
 * timeline is unusable at 390px — a 6-second chapter gets ~20px and its label
 * disappears entirely — so on phones chapters become full-width rows where the
 * title always fits and the whole row is a tap target.
 *
 * Chapters you've moved past collapse to a dimmed one-line row, the current one
 * expands with a progress fill, and upcoming ones sit plain with their start
 * time. So the list stays short as the video runs, and where you are reads at a
 * glance without scanning timestamps.
 */
export function ChapterList({ chapters, currentTime, duration, onSeek }: ChapterListProps) {
  const endOf = (index: number) => chapters[index + 1]?.startTime ?? duration

  const activeIndex = (() => {
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) return i
    }
    return 0
  })()

  return (
    <ul className="flex flex-col gap-0.5">
      {chapters.map((chapter, index) => {
        const isActive = index === activeIndex
        const isWatched = index < activeIndex
        const start = chapter.startTime
        const end = endOf(index)
        const fill = isActive && end > start
          ? Math.max(0, Math.min(1, (currentTime - start) / (end - start)))
          : 0

        return (
          <li key={chapter.id}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSeek(start)
              }}
              className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left transition-all duration-300 ease-out ${
                isActive
                  ? 'h-11 bg-white/[0.14]'
                  : isWatched
                    ? 'h-7 bg-transparent active:bg-white/10'
                    : 'h-9 bg-transparent active:bg-white/10'
              }`}
            >
              {/* Progress fill behind the active row's label */}
              {isActive && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-white/[0.16]"
                  style={{ width: `${fill * 100}%` }}
                  aria-hidden
                />
              )}

              <span
                className={`relative shrink-0 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'h-1.5 w-1.5 bg-white'
                    : isWatched
                      ? 'h-1 w-1 bg-white/35'
                      : 'h-1 w-1 bg-white/20'
                }`}
                aria-hidden
              />

              <span
                className={`relative min-w-0 flex-1 truncate transition-all duration-300 ${
                  isActive
                    ? 'text-[13px] font-medium text-white'
                    : isWatched
                      ? 'text-[11px] text-white/40'
                      : 'text-[13px] text-white/75'
                }`}
              >
                {chapter.title}
              </span>

              {/* Watched rows drop their timestamp — the row is already behind you */}
              {!isWatched && (
                <span
                  className={`relative shrink-0 font-mono text-[10px] tabular-nums ${
                    isActive ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  {formatDuration(Math.floor(start))}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
