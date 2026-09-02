import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { videos, findVideo, findCompanyVideos } from '@/data/videos'
import { CompanyView } from '@/components/company/company-view'
import { socialImageFor } from '@/lib/site'

// Pre-render every playable video's deep link. With dynamicParams off, any
// (company, slug) pair not in this set is a true routing-layer 404 — a real
// "this video doesn't exist", not a soft-404. (The parent /[company] segment
// keeps dynamicParams on so unknown companies still hit the request page.)
export const dynamicParams = false

export function generateStaticParams() {
  return videos
    .filter((v) => v.videoUrl)
    .map((v) => ({ company: v.companySlug, slug: v.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string; slug: string }>
}): Promise<Metadata> {
  const { company, slug } = await params
  const video = findVideo(company, slug)
  if (!video) return {}

  const title = `${video.title} — ${video.company}`
  const url = `/${video.companySlug}/${video.slug}`
  const image = video.thumbnailUrl
    ? { url: socialImageFor(video.thumbnailUrl, video.aspectRatio), width: 1200, height: 630, alt: title }
    : undefined

  return {
    title: `${title} — Lowkey`,
    description: video.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: video.description,
      url,
      siteName: 'Lowkey',
      type: 'video.other',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: video.description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ company: string; slug: string }>
}) {
  const { company, slug } = await params
  const video = findVideo(company, slug)

  // A known company with an unknown/non-playable video is a real 404 — not a
  // request page. The company exists; this specific video just doesn't.
  if (!video) notFound()

  // Reuse the company view, opening straight into the requested video.
  return <CompanyView videos={findCompanyVideos(company)} initialVideoSlug={slug} />
}
