import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Globe, Clock } from 'lucide-react'
import { companyService } from '@/services'
import { videos } from '@/data/videos'
import { Header } from '@/components/layout/header'
import { STYLE_LABELS } from '@/types/video'

interface CompanyPageProps {
  params: Promise<{ slug: string }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params

  // For now, derive company from videos data since we don't have companies table populated
  const companyVideos = videos.filter(
    video => video.company.toLowerCase().replace(/\s+/g, '-') === slug && video.videoUrl
  )

  if (companyVideos.length === 0) {
    notFound()
  }

  const firstVideo = companyVideos[0]
  const companyName = firstVideo.company

  // Calculate stats
  const totalDuration = companyVideos.reduce((acc, v) => acc + v.duration, 0)
  const styleCount: Record<string, number> = {}
  companyVideos.forEach(v => {
    styleCount[v.style] = (styleCount[v.style] || 0) + 1
  })
  const topStyle = Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to gallery
        </Link>

        {/* Company header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-12">
          {/* Logo placeholder - would come from companies table */}
          <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-muted">
              {companyName.slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">{companyName}</h1>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted mb-4">
              {firstVideo.websiteUrl && (
                <a
                  href={firstVideo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {new URL(firstVideo.websiteUrl).hostname.replace('www.', '')}
                </a>
              )}
              {firstVideo.twitterUrl && (
                <a
                  href={firstVideo.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                  Twitter
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-foreground font-medium">{companyVideos.length}</span>
                <span className="text-muted ml-1">{companyVideos.length === 1 ? 'video' : 'videos'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted" />
                <span className="text-foreground font-medium">{formatDuration(totalDuration)}</span>
                <span className="text-muted">total</span>
              </div>
              {topStyle && (
                <div>
                  <span className="text-muted">Top style:</span>
                  <span className="text-foreground font-medium ml-1">{STYLE_LABELS[topStyle[0] as keyof typeof STYLE_LABELS]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Videos section */}
        <div>
          <h2 className="text-lg font-medium text-foreground mb-6">Published Videos</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyVideos.map(video => (
              <Link
                key={video.id}
                href={`/video/${video.slug}`}
                className="group block"
              >
                <div className="aspect-video rounded-xl overflow-hidden bg-surface mb-3">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-white transition-colors mb-1">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span className="px-2 py-0.5 bg-surface rounded-full text-xs">
                      {STYLE_LABELS[video.style]}
                    </span>
                    <span>{formatDuration(video.duration)}</span>
                    <span>{new Date(video.publishedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
