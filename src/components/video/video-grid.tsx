'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoCard } from './video-card'
import { VideoCardSkeleton } from './video-card-skeleton'
import { VideoModal } from './video-modal'
import { LockedOverlay } from './locked-overlay'
import { useAuth } from '@/contexts/auth-context'

const FREE_VIDEO_COUNT = 12

interface VideoGridProps {
  videos: Video[]
  isLoading?: boolean
  columns?: number
}

export function VideoGrid({ videos, isLoading, columns = 4 }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const { authState } = useAuth()
  // During loading, assume logged in to prevent locked overlay flash
  // Worst case: logged-out user briefly sees all videos (acceptable)
  // Better than: logged-in user sees locked overlay flash (jarring)
  const isLoggedIn = authState !== 'unauthenticated'

  const freeVideos = videos.slice(0, FREE_VIDEO_COUNT)
  const lockedVideos = videos.slice(FREE_VIDEO_COUNT)

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
  }

  const handleCloseModal = () => {
    setSelectedVideo(null)
  }

  // CSS custom property for dynamic columns on md+
  const gridStyle = {
    '--grid-cols': columns,
  } as React.CSSProperties

  if (isLoading) {
    return (
      <div
        className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2 md:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))]"
        style={gridStyle}
      >
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
      {/* Free videos - always visible */}
      <div
        className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2 md:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))]"
        style={gridStyle}
      >
        {freeVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onSelect={handleVideoSelect}
          />
        ))}
      </div>

      {/* Locked section - show preview with overlay for guests */}
      {!isLoggedIn && lockedVideos.length > 0 && (
        <div className="relative mt-4 pb-[4%]">
          {/* Single row preview of locked videos - static thumbnails only */}
          <div
            className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2 md:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))] brightness-[0.6]"
            style={gridStyle}
          >
            {lockedVideos.slice(0, columns).map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={handleVideoSelect}
                disablePlayback
              />
            ))}
          </div>
          {/* Gradient + CTA overlay */}
          <LockedOverlay />
        </div>
      )}

      {/* Full access when logged in */}
      {isLoggedIn && lockedVideos.length > 0 && (
        <div
          className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2 md:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))] mt-4"
          style={gridStyle}
        >
          {lockedVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSelect={handleVideoSelect}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            allVideos={videos}
            onClose={handleCloseModal}
            onVideoChange={setSelectedVideo}
          />
        )}
      </AnimatePresence>
    </>
  )
}
