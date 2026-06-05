import type { Metadata } from 'next'
import { videos, findCompanyVideos } from '@/data/videos'
import { CompanyView } from '@/components/company/company-view'
import { RequestCompany } from '@/components/company/request-company'

// Pre-render the company pages we have videos for. Unknown slugs fall through
// to on-demand rendering (the request page).
export function generateStaticParams() {
  const slugs = new Set(videos.filter((v) => v.videoUrl).map((v) => v.companySlug))
  return Array.from(slugs, (company) => ({ company }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const { company } = await params
  const companyVideos = findCompanyVideos(company)

  // Request page: keep it out of the index so unknown URLs don't become a soft-404 farm.
  if (companyVideos.length === 0) {
    return { robots: { index: false, follow: false } }
  }

  const { company: name, description } = companyVideos[0]
  return {
    title: `${name} — Lowkey`,
    description,
  }
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company } = await params
  const companyVideos = findCompanyVideos(company)

  if (companyVideos.length === 0) {
    return <RequestCompany slug={company} />
  }

  return <CompanyView videos={companyVideos} />
}
