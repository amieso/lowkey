'use client'

import { Video } from '@/types/video'
import { VideoGrid } from './video-grid'

interface VideoSectionProps {
  videos: Video[]
}

export function VideoSection({ videos }: VideoSectionProps) {
  return (
    <div className="px-4 md:px-6 mt-8 md:mt-10">
      <VideoGrid videos={videos} columns={4} />
    </div>
  )
}
