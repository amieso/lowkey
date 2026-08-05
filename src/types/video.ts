// Narrative beat a chapter plays in the launch-video arc. Drives category
// filtering ("videos that skip the problem", "80% demo by runtime") while the
// user-facing label stays topical. Optional so legacy entries don't break.
export type ChapterBeat =
  | 'hook' // cold open / attention grab
  | 'problem' // the pain being addressed
  | 'solution' // what the product is
  | 'in-action' // live demo / product footage
  | 'proof' // benchmarks, testimonials, funding, credibility
  | 'cta' // call to action / outro

export interface Chapter {
  id: string
  title: string // topical, user-facing: "Dexterity Trials"
  startTime: number // in seconds
  beat?: ChapterBeat // structural, for categorization
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
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'
  websiteUrl?: string
  youtubeUrl?: string
  twitterUrl?: string
  sourceUrl?: string // link to the originating social post (x.com / YouTube), if any
  credits: Credit[]
  featured: boolean
  publishedDate: string
  chapters?: Chapter[]
}
