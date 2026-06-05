export type VideoStyle = 'kinetic-text' | '3d' | 'motion-graphics' | 'product-demo' | 'mixed'
export type ProductType = 'saas' | 'mobile' | 'fintech' | 'ecommerce' | 'dev-tools' | 'ai'

// New filter types
export type VideoPurpose = 'launch' | 'announcement' | 'funding' | 'demo' | 'thought-leadership'
export type Industry = 'ai-ml' | 'productivity' | 'developer-tools' | 'social' | 'hardware' | 'fintech' | 'design' | 'enterprise'
export type CompanyStage = 'seed' | 'series-a' | 'series-b-plus' | 'enterprise'
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
  bio?: string
  contactUrl?: string
  imageUrl?: string
  twitterHandle?: string
  instagramHandle?: string
}

export interface Video {
  id: string
  slug: string // unique within a company; used as the URL's second segment
  companySlug: string // stable URL key for the company, decoupled from the display name
  title: string
  company: string
  companyLogoUrl?: string
  companyFounded?: number // year founded
  description: string
  videoUrl: string
  thumbnailUrl: string
  style: VideoStyle
  duration: number // in seconds
  aspectRatio: '16:9' | '9:16'
  productType: ProductType
  // New filter properties
  purpose: VideoPurpose
  industry: Industry
  companyStage: CompanyStage
  websiteUrl?: string
  youtubeUrl?: string
  twitterUrl?: string
  credits: Credit[]
  featured: boolean
  publishedDate: string
  chapters?: Chapter[]
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  'saas': 'SaaS',
  'mobile': 'Mobile',
  'fintech': 'Fintech',
  'ecommerce': 'E-commerce',
  'dev-tools': 'Dev Tools',
  'ai': 'AI',
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  'ai-ml': 'AI/ML',
  'productivity': 'Productivity',
  'developer-tools': 'Developer Tools',
  'social': 'Social',
  'hardware': 'Hardware',
  'fintech': 'Fintech',
  'design': 'Design',
  'enterprise': 'Enterprise',
}

