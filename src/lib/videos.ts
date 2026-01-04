import { videos } from '@/data/videos'
import { Video, VideoStyle } from '@/types/video'

export function getAllVideos(): Video[] {
  return videos
}

export function getVideoBySlug(slug: string): Video | undefined {
  return videos.find((v) => v.slug === slug)
}

export function getVideosByStyle(style: VideoStyle): Video[] {
  return videos.filter((v) => v.style === style)
}

export function getFeaturedVideos(): Video[] {
  return videos.filter((v) => v.featured)
}

export function getFilteredVideos(style?: VideoStyle | null): Video[] {
  if (!style) return videos
  return getVideosByStyle(style)
}
