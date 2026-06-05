'use client'

import { Header } from '@/components/layout/header'
import { INDUSTRY_LABELS, PRODUCT_TYPE_LABELS, Video } from '@/types/video'
import { VideoCard } from '@/components/video/video-card'
import { VideoBackdrop } from '@/components/video/video-backdrop'
import { useExpandedVideo } from '@/components/video/use-expanded-video'

interface CompanyViewProps {
  videos: Video[]
  // When set, the matching video starts expanded — this is how a
  // /[company]/[slug] deep link opens straight into the player.
  initialVideoSlug?: string
}

export function CompanyView({ videos: companyVideos, initialVideoSlug }: CompanyViewProps) {
  const { expandedVideoId, instant, open, close } = useExpandedVideo(
    companyVideos,
    companyVideos.find((video) => video.slug === initialVideoSlug)?.id ?? null,
  )

  const firstVideo = companyVideos[0]
  const companyName = firstVideo.company
  const topIndustry = firstVideo.industry

  return (
    <div className="min-h-screen bg-background">
      <VideoBackdrop show={expandedVideoId !== null} onClose={close} />
      <Header />

      <main className="px-4 md:px-6 py-8">
        {/* Company Header Section - centered */}
        <div className="flex flex-col items-center text-center mb-12">
          {/* Logo */}
          <div className="mb-6">
            {firstVideo.companyLogoUrl ? (
              <img
                src={firstVideo.companyLogoUrl}
                alt={companyName}
                className="w-[72px] h-auto rounded-[16px]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = document.createElement('div')
                  fallback.className = 'w-[72px] h-[72px] rounded-[16px] bg-surface border border-border flex items-center justify-center'
                  const span = document.createElement('span')
                  span.className = 'text-2xl font-bold text-muted'
                  span.textContent = companyName.slice(0, 2).toUpperCase()
                  fallback.appendChild(span)
                  target.parentElement!.appendChild(fallback)
                }}
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-[16px] bg-surface border border-border flex items-center justify-center">
                <span className="text-2xl font-bold text-muted">
                  {companyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl font-normal text-foreground mb-4 tracking-tight">
            {companyName}
          </h1>

          {/* Bio - 3 lines max */}
          <p className="text-sm text-muted leading-relaxed mb-6 max-w-[440px] line-clamp-3">
            {firstVideo.description}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-2 text-sm">
            <div className="space-y-1.5">
              <span className="text-muted-dark font-mono text-[12px] uppercase tracking-wide block">Platform</span>
              <p className="text-foreground">{PRODUCT_TYPE_LABELS[firstVideo.productType]}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-muted-dark font-mono text-[12px] uppercase tracking-wide block">Videos</span>
              <p className="text-foreground">{companyVideos.length}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-muted-dark font-mono text-[12px] uppercase tracking-wide block">Category</span>
              <p className="text-foreground">{INDUSTRY_LABELS[topIndustry]}</p>
            </div>
            {firstVideo.companyFounded && (
              <div className="space-y-1.5">
                <span className="text-muted-dark font-mono text-[12px] uppercase tracking-wide block">Founded</span>
                <p className="text-foreground">{firstVideo.companyFounded}</p>
              </div>
            )}
          </div>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {companyVideos.map(video => (
            <div key={video.id} className="relative">
              <VideoCard
                video={video}
                onSelect={open}
                onClose={close}
                isExpanded={expandedVideoId === video.id}
                instant={instant}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
