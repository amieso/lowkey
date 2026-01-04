import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { HeroSection } from '@/components/hero-section'
import { VideoSection } from '@/components/video/video-section'
import { getFilteredVideos } from '@/lib/videos'
import { VideoStyle } from '@/types/video'

interface HomePageProps {
  searchParams: Promise<{ style?: VideoStyle }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const videos = getFilteredVideos(params.style)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <HeroSection />

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
