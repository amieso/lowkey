import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { HomeContent } from '@/components/home-content'
import { VideoSection } from '@/components/video/video-section'
import { getFilteredVideos } from '@/lib/videos'
import { VideoStyle, ProductType } from '@/types/video'

interface HomePageProps {
  searchParams: Promise<{ style?: VideoStyle; productType?: ProductType }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const videos = getFilteredVideos(params.style, params.productType)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section - only shown for logged out users */}
        <HomeContent />

        {/* Video Section (Control Bar + Grid) - edge to edge */}
        <div id="videos">
          <Suspense fallback={<div className="h-96" />}>
            <VideoSection videos={videos} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
