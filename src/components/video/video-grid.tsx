'use client'

import { motion } from 'framer-motion'
import { Video } from '@/types/video'
import { VideoCard } from './video-card'
import { PartnerCard } from './partner-card'
import { VideoBackdrop } from './video-backdrop'
import { useExpandedVideo } from './use-expanded-video'
import { useIntroContext } from '@/context/intro-context'

// Note: contentReady is not used here because VideoGrid only mounts
// after contentReady becomes true (controlled by HomePageWrapper)

interface VideoGridProps {
  videos: Video[]
  columns?: number
  /** Insert the "Ways to partner" card at this grid index (omit to hide it) */
  partnerCardAt?: number
}

export function VideoGrid({ videos, columns = 4, partnerCardAt }: VideoGridProps) {
  const { expandedVideoId, instant, open, close } = useExpandedVideo(videos, { basePath: '/' })
  const { shouldShowIntro, introPhase } = useIntroContext()

  // The grid now mounts behind the intro overlay, so its entrance is driven by
  // the intro phase (the settling reveal) rather than by mount.
  const revealed = !shouldShowIntro || introPhase === 'settling' || introPhase === 'done'

  // While a video is full-screen, keep its arrow-nav neighbours (n-1 / n+1)
  // mounted and pre-upscaled so switching to them is instant and already sharp.
  const playableIds = videos.filter((video) => video.videoUrl).map((video) => video.id)
  const expandedIdx = expandedVideoId ? playableIds.indexOf(expandedVideoId) : -1
  const neighborIds = new Set<string>()
  if (expandedIdx !== -1 && playableIds.length > 1) {
    const len = playableIds.length
    neighborIds.add(playableIds[(expandedIdx + 1) % len])
    neighborIds.add(playableIds[(expandedIdx - 1 + len) % len])
  }

  const gridStyle = {
    '--grid-cols': columns,
  } as React.CSSProperties

  // Build the ordered list of grid cells, optionally splicing in the partner card.
  type GridItem = { key: string; video: Video | null }
  const items: GridItem[] = videos.map((video) => ({ key: video.id, video }))
  if (partnerCardAt !== undefined) {
    const at = Math.max(0, Math.min(partnerCardAt, items.length))
    items.splice(at, 0, { key: 'partner-card', video: null })
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted">No videos found</p>
      </div>
    )
  }

  return (
    <>
      <VideoBackdrop show={expandedVideoId !== null} onClose={close} />
      <div
        className="no-focus-ring grid gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-4 grid-cols-1 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--grid-cols),minmax(0,1fr))]"
        style={gridStyle}
      >
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          className="relative"
          initial={shouldShowIntro ? { opacity: 0, y: 40, scale: 0.92 } : false}
          animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.92 }}
          transition={{
            duration: 0.5,
            delay: shouldShowIntro && revealed ? index * 0.05 : 0,
            ease: [0.23, 1, 0.32, 1],
          }}
        >
          {item.video ? (
            <VideoCard
              video={item.video}
              onSelect={open}
              onClose={close}
              isExpanded={expandedVideoId === item.video.id}
              instant={instant}
              preload={neighborIds.has(item.video.id)}
              backgrounded={expandedVideoId !== null && expandedVideoId !== item.video.id}
            />
          ) : (
            <PartnerCard />
          )}
        </motion.div>
      ))}
      </div>
    </>
  )
}
