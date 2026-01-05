export type VideoStyle = 'kinetic-text' | '3d' | 'motion-graphics' | 'product-demo' | 'mixed'
export type ProductType = 'saas' | 'mobile-app' | 'consumer' | 'dev-tool' | 'other'

export interface Chapter {
  id: string
  title: string
  startTime: number // in seconds
}

export interface Credit {
  role: string
  name: string
  handle?: string
  url?: string
}

export type SegmentType = 'problem' | 'solution' | 'in-action' | 'cta' | 'intro' | 'outro'

export interface Segment {
  id: string
  type: SegmentType
  title: string
  description: string
  startTime: number
  endTime: number
}

export interface TranscriptEntry {
  id: string
  startTime: number
  text: string
}

export interface Comment {
  id: string
  author: string
  avatarUrl?: string
  text: string
  timestamp: string
  likes: number
}

export interface Video {
  id: string
  slug: string
  title: string
  company: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  style: VideoStyle
  duration: number // in seconds
  aspectRatio: '16:9' | '9:16'
  productType: ProductType
  websiteUrl?: string
  youtubeUrl?: string
  twitterUrl?: string
  credits: Credit[]
  featured: boolean
  publishedDate: string
  chapters?: Chapter[]
}

export const STYLE_LABELS: Record<VideoStyle, string> = {
  'kinetic-text': 'Kinetic Text',
  '3d': '3D',
  'motion-graphics': 'Motion Graphics',
  'product-demo': 'Product Demo',
  'mixed': 'Mixed',
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  'saas': 'SaaS',
  'mobile-app': 'Mobile App',
  'consumer': 'Consumer',
  'dev-tool': 'Dev Tool',
  'other': 'Other',
}
