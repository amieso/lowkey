'use client'

import { useMemo, useState } from 'react'
import { Video } from '@/types/video'
import { VideoGrid } from './video-grid'
import { getMetrics } from '@/lib/metrics'
import { cn } from '@/lib/utils'

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

  // 'recent' keeps the server order (newest first). 'views' ranks by cached X
  // impressions; videos without metrics sink to the end in their recent order.
  const sorted = useMemo(() => {
    if (sort === 'recent') return videos
    const views = (v: Video) => getMetrics(v.sourceUrl)?.impressions ?? -1
    return [...videos].sort((a, b) => views(b) - views(a))
  }, [videos, sort])

  return (
    <div className="px-4 md:px-6 mt-8 md:mt-10">
      <div className="flex items-center justify-end gap-1 mb-3 md:mb-4">
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
      </div>
      <VideoGrid videos={sorted} columns={4} partnerCardAt={4} />
    </div>
  )
}
