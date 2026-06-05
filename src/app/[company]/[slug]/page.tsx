import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { videos, findVideo, findCompanyVideos } from '@/data/videos'
import { CompanyView } from '@/components/company/company-view'

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

  return {
    title: `${video.title} — ${video.company} — Lowkey`,
    description: video.description,
    openGraph: {
      title: `${video.title} — ${video.company}`,
      description: video.description,
      images: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
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
