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
  duration: number // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1'
  websiteUrl?: string
  youtubeUrl?: string
  twitterUrl?: string
  sourceUrl?: string // link to the originating social post (x.com / YouTube), if any
  credits: Credit[]
  featured: boolean
  publishedDate: string
  chapters?: Chapter[]
}
