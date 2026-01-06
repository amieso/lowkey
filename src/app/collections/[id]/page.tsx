'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Globe, MoreHorizontal, Trash2, Pencil, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { collectionService, type CollectionWithItems } from '@/services'
import { Header } from '@/components/layout/header'
import { getVideoBySlug } from '@/lib/videos'

export default function CollectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, authState } = useAuth()
  const [collection, setCollection] = useState<CollectionWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  const collectionId = params.id as string

  useEffect(() => {
    async function fetchCollection() {
      setIsLoading(true)
      try {
        const data = await collectionService.getCollection(collectionId)
        setCollection(data)
      } catch (error) {
        console.error('Error fetching collection:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCollection()
  }, [collectionId])

  const handleDelete = async () => {
    if (!collection || collection.is_default) return

    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      await collectionService.deleteCollection(collectionId)
      router.push('/profile')
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const handleRemoveVideo = async (videoSlug: string) => {
    if (!collection) return

    try {
      await collectionService.removeFromCollection(collectionId, videoSlug)
      setCollection(prev => prev ? {
        ...prev,
        items: prev.items.filter(item => item.video_slug !== videoSlug),
        item_count: prev.item_count - 1
      } : null)
    } catch (error) {
      console.error('Error removing video:', error)
    }
  }

  const isOwner = user?.id === collection?.user_id

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-xl font-medium text-foreground mb-2">Collection not found</h1>
        <p className="text-muted mb-6">This collection may have been deleted or made private.</p>
        <Link
          href="/"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Go back home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Link
              href={isOwner ? '/profile' : '/'}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface hover:bg-surface/80 transition-colors mt-1"
            >
              <ArrowLeft className="w-4 h-4 text-muted" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-semibold text-foreground">{collection.name}</h1>
                {collection.is_public ? (
                  <Globe className="w-4 h-4 text-muted" />
                ) : (
                  <Lock className="w-4 h-4 text-muted" />
                )}
              </div>
              {collection.description && (
                <p className="text-muted mb-2">{collection.description}</p>
              )}
              <p className="text-sm text-muted-dark">
                {collection.item_count} {collection.item_count === 1 ? 'video' : 'videos'}
              </p>
            </div>
          </div>

          {isOwner && !collection.is_default && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface hover:bg-surface/80 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-muted" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-48 py-1 bg-surface border border-border rounded-xl shadow-lg">
                    <button
                      onClick={() => {/* TODO: edit modal */}}
                      className="w-full px-4 py-2 text-left text-sm text-muted hover:text-foreground hover:bg-white/5 flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Collection
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Collection
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Videos grid */}
        {collection.items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">No videos in this collection yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collection.items.map(item => {
              const video = getVideoBySlug(item.video_slug)
              if (!video) return null

              return (
                <div key={item.id} className="group relative">
                  <Link
                    href={`/video/${video.slug}`}
                    className="block aspect-video rounded-xl overflow-hidden bg-surface"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                        <p className="text-xs text-muted">{video.company}</p>
                      </div>
                    </div>
                  </Link>

                  {isOwner && (
                    <button
                      onClick={() => handleRemoveVideo(video.slug)}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                      title="Remove from collection"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}

                  {item.note && (
                    <p className="mt-2 text-xs text-muted line-clamp-2">{item.note}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
