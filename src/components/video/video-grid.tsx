'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoCard } from './video-card'
import { useIntroContext } from '@/context/intro-context'

// Note: contentReady is not used here because VideoGrid only mounts
// after contentReady becomes true (controlled by HomePageWrapper)

interface VideoGridProps {
  videos: Video[]
  columns?: number
}

export function VideoGrid({ videos, columns = 4 }: VideoGridProps) {
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const { shouldShowIntro } = useIntroContext()

  // With the new approach, VideoGrid only mounts when:
  // 1. No intro needed (shouldShowIntro=false) - show immediately
  // 2. Intro finished (contentReady=true) - animate in with stagger
  // So we just check shouldShowIntro to decide whether to animate

  const gridStyle = {
    '--grid-cols': columns,
  } as React.CSSProperties

  const handleVideoSelect = useCallback((video: Video) => {
    setExpandedVideoId(video.id)
  }, [])

  const handleExpandedClose = useCallback(() => {
    setExpandedVideoId(null)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">No videos found</p>
      </div>
    )
  }

  return (
    <div
      className="grid gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4 grid-cols-1 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))]"
      style={gridStyle}
    >
      {videos.map((video, index) => (
        <motion.div
          key={video.id}
          className={expandedVideoId === video.id ? 'relative z-[130]' : 'relative z-0'}
          initial={shouldShowIntro ? { opacity: 0, y: 40, scale: 0.92 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: shouldShowIntro ? index * 0.05 : 0,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          <VideoCard
            video={video}
            onSelect={handleVideoSelect}
            isExpanded={expandedVideoId === video.id}
            hasExpandedVideo={expandedVideoId !== null}
            onClose={handleExpandedClose}
          />
        </motion.div>
      ))}
    </div>
  )
}
