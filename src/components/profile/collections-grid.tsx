'use client'

import Link from 'next/link'
import { Plus, Bookmark, Lock, Globe } from 'lucide-react'
import type { CollectionWithItems } from '@/services/collection-service'
import { getVideoBySlug } from '@/lib/videos'

interface CollectionsGridProps {
  collections: CollectionWithItems[]
  showSavedOnly?: boolean
  onCreateNew?: () => void
}

export function CollectionsGrid({ collections, showSavedOnly, onCreateNew }: CollectionsGridProps) {
  if (collections.length === 0 && !showSavedOnly) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
          <Bookmark className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No collections yet</h3>
        <p className="text-muted mb-6 max-w-sm mx-auto">
          Create collections to organize your favorite launch videos by theme, style, or project.
        </p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm text-foreground bg-white/10 rounded-full hover:bg-white/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Collection
          </button>
        )}
      </div>
    )
  }

  if (showSavedOnly) {
    // No saved collection exists yet, or it's empty
    if (collections.length === 0 || collections[0].items.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No saved videos yet</h3>
          <p className="text-muted max-w-sm mx-auto">
            Click the + icon on any video to save it here for quick access.
          </p>
        </div>
      )
    }

    const savedCollection = collections[0]

    // Show saved videos directly in a grid
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {savedCollection.items.map(item => {
          const video = getVideoBySlug(item.video_slug)
          if (!video) return null

          return (
            <Link
              key={item.id}
              href={`/video/${video.slug}`}
              className="group relative aspect-video rounded-xl overflow-hidden bg-surface"
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* Create new collection card */}
      {onCreateNew && (
        <button
          onClick={onCreateNew}
          className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-muted flex flex-col items-center justify-center gap-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
            <Plus className="w-5 h-5 text-muted" />
          </div>
          <span className="text-sm text-muted">New Collection</span>
        </button>
      )}

      {/* Collection cards */}
      {collections.map(collection => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

function CollectionCard({ collection }: { collection: CollectionWithItems }) {
  // Get thumbnails from first 4 items
  const thumbnails = collection.items.slice(0, 4).map(item => {
    const video = getVideoBySlug(item.video_slug)
    return video?.thumbnailUrl
  }).filter(Boolean) as string[]

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block"
    >
      {/* Thumbnail grid */}
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-surface mb-3">
        {thumbnails.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-muted-dark" />
          </div>
        ) : thumbnails.length === 1 ? (
          <img
            src={thumbnails[0]}
            alt=""
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="relative overflow-hidden">
                {thumbnails[i] ? (
                  <img
                    src={thumbnails[i]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground group-hover:text-white transition-colors">
            {collection.name}
          </h3>
          <p className="text-sm text-muted">
            {collection.item_count} {collection.item_count === 1 ? 'video' : 'videos'}
          </p>
        </div>
        {collection.is_public ? (
          <Globe className="w-4 h-4 text-muted-dark flex-shrink-0" />
        ) : (
          <Lock className="w-4 h-4 text-muted-dark flex-shrink-0" />
        )}
      </div>
    </Link>
  )
}
