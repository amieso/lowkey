import type { Metadata } from 'next'
import { videos, findCompanyVideos } from '@/data/videos'
import { CompanyView } from '@/components/company/company-view'
import { RequestCompany } from '@/components/company/request-company'
import { socialImageFor } from '@/lib/site'

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

  const lead = companyVideos[0]
  const name = lead.company
  const count = companyVideos.length
  const description = `${count} launch video${count === 1 ? '' : 's'} from ${name}, curated on Lowkey.`
  const url = `/${company}`
  const image = lead.thumbnailUrl
    ? { url: socialImageFor(lead.thumbnailUrl, lead.aspectRatio), width: 1200, height: 630, alt: `${name} on Lowkey` }
    : undefined

  return {
    title: `${name} — Lowkey`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} launch videos`,
      description,
      url,
      siteName: 'Lowkey',
      type: 'website',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} launch videos`,
      description,
      images: image ? [image] : undefined,
    },
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
