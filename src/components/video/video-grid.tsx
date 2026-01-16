'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'

interface VideoGridProps {
  videos: Video[]
  columns?: number
}

export function VideoGrid({ videos, columns = 4 }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  const gridStyle = {
    '--grid-cols': columns,
  } as React.CSSProperties

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">No videos found</p>
      </div>
    )
  }

  return (
    <>
      <div
        className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2 md:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))]"
        style={gridStyle}
      >
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={setSelectedVideo}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            allVideos={videos}
            onClose={() => setSelectedVideo(null)}
            onVideoChange={setSelectedVideo}
          />
        )}
      </AnimatePresence>
    </>
  )
}
