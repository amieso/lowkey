import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { VideoPlayer } from '@/components/video/video-player'
import { InfoPane } from '@/components/video/info-pane'
import { getVideoBySlug, getAllVideos } from '@/lib/videos'

interface VideoPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const videos = getAllVideos()
  return videos.map((video) => ({ slug: video.slug }))
}

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { slug } = await params
  const video = getVideoBySlug(slug)

  if (!video) {
    return {
      title: 'Video Not Found | Lowkey',
    }
  }

  return {
    title: `${video.title} by ${video.company} | Lowkey`,
    description: video.description,
    openGraph: {
      title: `${video.title} by ${video.company}`,
      description: video.description,
      images: [video.thumbnailUrl],
    },
  }
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { slug } = await params
  const video = getVideoBySlug(slug)

  if (!video) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          {/* Back Link */}
          <div className="py-4 border-b border-border">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] py-6">
            {/* Video Column */}
            <div>
              <VideoPlayer
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                aspectRatio={video.aspectRatio}
              />
            </div>

            {/* Info Column */}
            <InfoPane video={video} />
          </div>
        </div>
      </main>
    </div>
  )
}
