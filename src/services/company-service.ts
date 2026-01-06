import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types/database'
import { videos } from '@/data/videos'
import type { Video } from '@/types/video'

class CompanyService {
  private supabase = createClient()

  async getCompany(slug: string): Promise<Company | null> {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Error fetching company:', error)
      return null
    }

    return data
  }

  async getAllCompanies(): Promise<Company[]> {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching companies:', error)
      return []
    }

    return data
  }

  async getCompanyVideos(companySlug: string): Promise<Video[]> {
    // For now, filter from local videos data by company name
    // Later this can query a videos table with company_id foreign key
    const company = await this.getCompany(companySlug)
    if (!company) return []

    return videos.filter(
      video => video.company.toLowerCase() === company.name.toLowerCase()
    )
  }

  async getCompanyStats(companySlug: string): Promise<{
    videoCount: number
    totalDuration: number
    styles: Record<string, number>
  }> {
    const companyVideos = await this.getCompanyVideos(companySlug)

    const styles: Record<string, number> = {}
    let totalDuration = 0

    companyVideos.forEach(video => {
      totalDuration += video.duration
      styles[video.style] = (styles[video.style] || 0) + 1
    })

    return {
      videoCount: companyVideos.length,
      totalDuration,
      styles,
    }
  }

  // Get unique companies from local videos data (for migration/seeding)
  getUniqueCompaniesFromVideos(): { name: string; slug: string; websiteUrl?: string; twitterUrl?: string }[] {
    const companyMap = new Map<string, { name: string; slug: string; websiteUrl?: string; twitterUrl?: string }>()

    videos.forEach(video => {
      if (!companyMap.has(video.company)) {
        companyMap.set(video.company, {
          name: video.company,
          slug: video.company.toLowerCase().replace(/\s+/g, '-'),
          websiteUrl: video.websiteUrl,
          twitterUrl: video.twitterUrl,
        })
      }
    })

    return Array.from(companyMap.values())
  }
}

export const companyService = new CompanyService()
