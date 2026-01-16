import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { HomeContent } from '@/components/home-content'
import { VideoSection } from '@/components/video/video-section'
import { videos } from '@/data/videos'

export default async function HomePage() {
  const allVideos = videos

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HomeContent />

        <div id="videos">
          <Suspense fallback={<div className="h-96" />}>
            <VideoSection videos={allVideos} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
