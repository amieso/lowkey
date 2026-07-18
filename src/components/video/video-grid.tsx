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

// How long the non-target cards hold after the intro's 'settling' signal
// before starting their stagger. Tuned so they begin around the split rather
// than during the hold (too early) or at the first landing (too late).
const NON_TARGET_LEAD_S = 0.5

export function VideoGrid({ videos, columns = 4, partnerCardAt }: VideoGridProps) {
  const { expandedVideoId, instant, open, close } = useExpandedVideo(videos, { basePath: '/' })
  const { shouldShowIntro, introPhase, introTargetCount, introLandedCount } = useIntroContext()

  // The grid now mounts behind the intro overlay, so its entrance is driven by
  // the intro phase (the settling reveal) rather than by mount. The supercut
  // fires 'settling' mid-flight, so cards stagger in UNDER the still-flying
  // rectangle — but the cards its pieces land on must not appear before the
  // pieces cover them, so those wait for 'done' (when the pieces start their
  // fade). The intro decides at runtime how many cards it lands on
  // (introTargetCount: 4 when it splits, 1 on narrow layouts).
  // The non-target rows key off 'settling', which fires partway through the
  // hold — too early to start moving on its own, since the rectangle is still
  // cutting in place — so they wait NON_TARGET_LEAD_S past it and begin around
  // the split instead, staggering in under the pieces as they fly. That lands
  // them roughly a beat before the first piece touches down, which is what
  // used to gate them. The target cards still reveal as ONE simultaneous fade
  // once the LAST piece has seated (their media boxes are covered by the
  // landed pieces until then). 'done' is the catch-all for both.
  const allPiecesSeated = introTargetCount > 0 && introLandedCount >= introTargetCount
  const revealed = !shouldShowIntro || introPhase === 'settling' || introPhase === 'done'
  const targetRevealed = !shouldShowIntro || introPhase === 'done' || allPiecesSeated

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
      {items.map((item, index) => {
        // The first cards are the supercut intro's landing slots: its pieces
        // shrink onto their exact rects and ARE their entrances, so they must
        // appear instantly at the reveal (no fly-in, no stagger delay) —
        // they're covered pixel-for-pixel by the landed pieces anyway. All
        // four candidates carry the marker (the intro measures them before
        // deciding whether to split); only the first introTargetCount are
        // actually held back from the normal stagger.
        const isSupercutCandidate = item.video != null && index < 4
        const isSupercutTarget = isSupercutCandidate && index < introTargetCount
        return (
        <motion.div
          key={item.key}
          data-supercut-target={isSupercutCandidate ? String(index) : undefined}
          className="relative"
          initial={shouldShowIntro ? (isSupercutTarget ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.92 }) : false}
          animate={
            (isSupercutTarget ? targetRevealed : revealed)
              ? { opacity: 1, y: 0, scale: 1 }
              : isSupercutTarget
                ? { opacity: 0 }
                : { opacity: 0, y: 40, scale: 0.92 }
          }
          transition={{
            // Targets get a short fade, not a pop: their media box is covered
            // by the landed piece (which is fading out at the same time), and
            // the meta row below it eases in instead of snapping.
            duration: isSupercutTarget ? 0.25 : 0.5,
            delay:
              shouldShowIntro && revealed && !isSupercutTarget
                ? NON_TARGET_LEAD_S + index * 0.05
                : 0,
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
        )
      })}
      </div>
    </>
  )
}
