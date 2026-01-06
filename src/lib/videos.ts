import { videos } from '@/data/videos'
import { Video, VideoStyle, ProductType } from '@/types/video'

export function getAllVideos(): Video[] {
  return videos
}

export function getVideoBySlug(slug: string): Video | undefined {
  return videos.find((v) => v.slug === slug)
}

export function getVideosByStyle(style: VideoStyle): Video[] {
  return videos.filter((v) => v.style === style)
}

export function getVideosByProductType(productType: ProductType): Video[] {
  return videos.filter((v) => v.productType === productType)
}

export function getFeaturedVideos(): Video[] {
  return videos.filter((v) => v.featured)
}

interface FilterOptions {
  style?: VideoStyle | null
  productType?: ProductType | null
}

export function getFilteredVideos(
  styleOrOptions?: VideoStyle | FilterOptions | null,
  productType?: ProductType | null
): Video[] {
  // Handle legacy single-argument call
  if (typeof styleOrOptions === 'string' || styleOrOptions === null || styleOrOptions === undefined) {
    const style = styleOrOptions as VideoStyle | null | undefined
    let result = videos
    if (style) {
      result = result.filter((v) => v.style === style)
    }
    if (productType) {
      result = result.filter((v) => v.productType === productType)
    }
    return result
  }

  // Handle options object
  const options = styleOrOptions as FilterOptions
  let result = videos
  if (options.style) {
    result = result.filter((v) => v.style === options.style)
  }
  if (options.productType) {
    result = result.filter((v) => v.productType === options.productType)
  }
  return result
}
