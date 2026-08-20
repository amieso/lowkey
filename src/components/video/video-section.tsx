'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoGrid } from './video-grid'
import { getMetrics } from '@/lib/metrics'
import { cn } from '@/lib/utils'
import { useIntroContext } from '@/context/intro-context'

interface VideoSectionProps {
  videos: Video[]
}

type SortKey = 'recent' | 'views'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'views', label: 'Views' },
]

export function VideoSection({ videos }: VideoSectionProps) {
  const [sort, setSort] = useState<SortKey>('recent')
  const { shouldShowIntro, introPhase } = useIntroContext()

  // The sort row joins the intro orchestration like a non-target grid card:
  // hidden until 'settling', then it rises in just ahead of the card stagger
  // (it sits above the first row, so it leads). Same motion values as the
  // grid's non-target cells in video-grid.tsx.
  const revealed = !shouldShowIntro || introPhase === 'settling' || introPhase === 'done'

  // 'recent' keeps the server order (newest first). 'views' ranks by cached X
  // impressions; videos without metrics sink to the end in their recent order.
  const sorted = useMemo(() => {
    if (sort === 'recent') return videos
    const views = (v: Video) => getMetrics(v.sourceUrl)?.impressions ?? -1
    return [...videos].sort((a, b) => views(b) - views(a))
  }, [videos, sort])

  return (
    <div className="px-4 md:px-6 mt-8 md:mt-10">
      <motion.div
        className="flex items-center justify-end gap-1 mb-3 md:mb-4"
        initial={shouldShowIntro ? { opacity: 0, y: 40, scale: 0.92 } : false}
        animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.92 }}
        transition={{ duration: 0.5, delay: shouldShowIntro && revealed ? 0.1 : 0, ease: [0.23, 1, 0.32, 1] }}
      >
        <span className="text-xs text-muted-dark mr-1">Sort by</span>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setSort(option.key)}
            className={cn(
              'inline-flex h-7 items-center rounded-full px-3 text-xs transition-colors',
              sort === option.key
                ? 'bg-foreground/5 text-foreground'
                : 'text-muted hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </motion.div>
      <VideoGrid videos={sorted} columns={4} partnerCardAt={4} />
    </div>
  )
}
