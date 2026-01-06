'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bookmark, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Header } from '@/components/layout/header'
import { getVideoBySlug } from '@/lib/videos'

export default function SavedPage() {
  const router = useRouter()
  const { user, authState, savedVideoSlugs } = useAuth()

  useEffect(() => {
    if (authState === 'unauthenticated') {
      router.push('/')
    }
  }, [authState, router])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    )
  }

  if (authState !== 'authenticated' || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-foreground mb-8">Saved</h1>

        {savedVideoSlugs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
              <Bookmark className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No saved videos yet</h3>
            <p className="text-muted max-w-sm mx-auto">
              Click the + icon on any video to save it here for quick access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {savedVideoSlugs.map(slug => {
              const video = getVideoBySlug(slug)
              if (!video) return null

              return (
                <Link
                  key={slug}
                  href={`/?video=${video.slug}`}
                  className="group relative aspect-video rounded-xl overflow-hidden bg-surface"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-medium text-white line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-white/70 mt-1">{video.company}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
