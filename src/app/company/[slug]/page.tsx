'use client'

import { useCallback, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { videos } from '@/data/videos'
import { Header } from '@/components/layout/header'
import { INDUSTRY_LABELS, PRODUCT_TYPE_LABELS, Video } from '@/types/video'
import { VideoCard } from '@/components/video/video-card'
import { VideoModal } from '@/components/video/video-modal'

export default function CompanyPage() {
  const params = useParams()
  const slug = params.slug as string
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState(0)
  const [selectedHandoffVideoElement, setSelectedHandoffVideoElement] = useState<HTMLVideoElement | null>(null)
  const [activeLayoutVideoId, setActiveLayoutVideoId] = useState<string | null>(null)

  // Filter videos for this company
  const companyVideos = videos.filter(
    video => video.company.toLowerCase().replace(/\s+/g, '-') === slug && video.videoUrl
  )

  if (companyVideos.length === 0) {
    notFound()
  }

  const firstVideo = companyVideos[0]
  const companyName = firstVideo.company
  const topIndustry = firstVideo.industry

  const handleVideoSelect = useCallback((video: Video, startTime: number, handoffVideoElement?: HTMLVideoElement | null) => {
    setActiveLayoutVideoId(video.id)
    setSelectedVideo(video)
    setSelectedStartTime(startTime)
    setSelectedHandoffVideoElement(handoffVideoElement ?? null)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedVideo(null)
    setSelectedStartTime(0)
    setSelectedHandoffVideoElement(null)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
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

        <LayoutGroup id="company-video-layout">
          {/* Video grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {companyVideos.map(video => (
              <div key={video.id} className={activeLayoutVideoId === video.id ? 'relative z-[60]' : 'relative z-0'}>
                <VideoCard
                  video={video}
                  onSelect={handleVideoSelect}
                  isLayoutActive={activeLayoutVideoId === video.id}
                />
              </div>
            ))}
          </div>

          {/* Video Modal */}
          <AnimatePresence mode="wait" onExitComplete={() => setActiveLayoutVideoId(null)}>
            {selectedVideo && (
              <VideoModal
                video={selectedVideo}
                initialTime={selectedStartTime}
                handoffVideoElement={selectedHandoffVideoElement}
                onClose={handleModalClose}
              />
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>
    </div>
  )
}
