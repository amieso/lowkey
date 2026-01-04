'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoCard } from './video-card'
import { VideoCardSkeleton } from './video-card-skeleton'
import { VideoModal } from './video-modal'

interface VideoGridProps {
  videos: Video[]
  isLoading?: boolean
  columns?: number
}

const getGridStyle = (columns: number) => ({
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
})

export function VideoGrid({ videos, isLoading, columns = 4 }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
  }

  const handleCloseModal = () => {
    setSelectedVideo(null)
  }

  if (isLoading) {
    return (
      <div className="grid gap-6" style={getGridStyle(columns)}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">No videos match this filter</p>
      </div>
    )
  }

  return (
    <>
      <div
        className="grid gap-x-6 gap-y-3"
        style={getGridStyle(columns)}
      >
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={handleVideoSelect}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <VideoModal video={selectedVideo} onClose={handleCloseModal} />
        )}
      </AnimatePresence>
    </>
  )
}
