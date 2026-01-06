'use client'

import { useState } from 'react'
import { Video } from '@/types/video'
import { VideoCard } from './video/video-card'
import { VideoModal } from './video/video-modal'

interface FeaturedVideosProps {
  videos: Video[]
}

export function FeaturedVideos({ videos }: FeaturedVideosProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  if (videos.length === 0) return null

  // Take only first 4 featured videos
  const featuredVideos = videos.slice(0, 4)

  return (
    <>
      <section className="px-4 md:px-6 pb-8">
        <div className="max-w-[1800px] mx-auto">
          <h2 className="text-sm font-medium text-muted uppercase tracking-widest mb-4">
            Featured
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={setSelectedVideo}
              />
            ))}
          </div>
        </div>
      </section>

      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          allVideos={featuredVideos}
          onClose={() => setSelectedVideo(null)}
          onVideoChange={setSelectedVideo}
        />
      )}
    </>
  )
}
