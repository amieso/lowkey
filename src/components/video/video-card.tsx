'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Hls from 'hls.js'
import { Video } from '@/types/video'
import { formatDuration } from '@/lib/utils'
import { CompanyLink } from '@/components/ui/company-link'
import { memo } from 'react'

const SHARED_LAYOUT_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const

interface VideoCardProps {
  video: Video
  onSelect: (video: Video, startTime: number, handoffVideoElement?: HTMLVideoElement | null) => void
  disablePlayback?: boolean
  isLayoutActive?: boolean
}

export const VideoCard = memo(function VideoCard({
  video,
  onSelect,
  disablePlayback = false,
  isLayoutActive = false,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wasLayoutActiveRef = useRef(false)
  const isGhost = !video.videoUrl
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false)
  const [showLayoutCover, setShowLayoutCover] = useState(false)

  useEffect(() => {
    setHasRenderedFrame(false)
    setShowLayoutCover(false)
    wasLayoutActiveRef.current = false
  }, [video.id])

  useEffect(() => {
    if (isGhost || disablePlayback) return

    const videoEl = videoRef.current
    if (!videoEl) return

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(video.videoUrl)
      hls.attachMedia(videoEl)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {})
      })
      return () => hls.destroy()
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      videoEl.src = video.videoUrl
      videoEl.play().catch(() => {})
    }
  }, [video.videoUrl, isGhost, disablePlayback])

  useEffect(() => {
    if (isGhost || disablePlayback) return
    const videoEl = videoRef.current
    if (!videoEl) return

    const markRendered = () => setHasRenderedFrame(true)

    if (videoEl.readyState >= 2) {
      setHasRenderedFrame(true)
    }

    videoEl.addEventListener('loadeddata', markRendered)
    videoEl.addEventListener('playing', markRendered)

    return () => {
      videoEl.removeEventListener('loadeddata', markRendered)
      videoEl.removeEventListener('playing', markRendered)
    }
  }, [video.id, isGhost, disablePlayback])

  useEffect(() => {
    if (isGhost || disablePlayback) return

    const videoEl = videoRef.current
    if (!videoEl) return

    if (isLayoutActive) {
      wasLayoutActiveRef.current = true
      setShowLayoutCover(true)
      return
    }

    if (!wasLayoutActiveRef.current) return
    wasLayoutActiveRef.current = false

    // Keep cover until the next decoded frame after the element returns to the card.
    if ('requestVideoFrameCallback' in videoEl && typeof videoEl.requestVideoFrameCallback === 'function') {
      const callbackId = videoEl.requestVideoFrameCallback(() => {
        setShowLayoutCover(false)
      })
      return () => {
        if (typeof videoEl.cancelVideoFrameCallback === 'function') {
          videoEl.cancelVideoFrameCallback(callbackId)
        }
      }
    }

    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShowLayoutCover(false))
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [isLayoutActive, isGhost, disablePlayback])

  const handleClick = () => {
    if (!isGhost) {
      const currentTime = videoRef.current?.currentTime ?? 0
      onSelect(video, Number.isFinite(currentTime) ? currentTime : 0, videoRef.current)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isGhost) {
      e.preventDefault()
      const currentTime = videoRef.current?.currentTime ?? 0
      onSelect(video, Number.isFinite(currentTime) ? currentTime : 0, videoRef.current)
    }
  }

  return (
    <article
      role={isGhost ? undefined : 'button'}
      tabIndex={isGhost ? undefined : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group ${isGhost ? '' : 'cursor-pointer'}`}
    >
      {/* Video container - always 16:9 */}
      <motion.div
        layoutId={isGhost ? undefined : `video-${video.id}`}
        transition={SHARED_LAYOUT_TRANSITION}
        className="relative aspect-video w-full rounded-[6px] group-hover:ring-1 group-hover:ring-foreground/10"
      >
        <div className="absolute inset-0 overflow-hidden rounded-[6px] bg-surface isolate">
          {isGhost ? (
            // Ghost card placeholder
            <div className="absolute inset-0 bg-surface" />
          ) : disablePlayback ? (
            // Static thumbnail for locked cards
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover rounded-[6px]"
            />
          ) : (
            <>
              <img
                src={video.thumbnailUrl}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 z-20 h-full w-full object-cover rounded-[6px] transition-opacity duration-120 ${
                  hasRenderedFrame && !showLayoutCover ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                className="absolute inset-0 z-10 h-full w-full object-cover rounded-[6px]"
              />
            </>
          )}

          {/* Hover labels - keep video visible while showing metadata */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-start p-3 md:p-5 pointer-events-none hidden md:flex">
            <span className="text-[10px] md:text-xs text-white/90 tracking-widest uppercase font-mono w-fit rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.company}</span>
            <h3 className="text-lg md:text-2xl font-light text-white tracking-tight line-clamp-2 mt-1 md:mt-2 w-fit max-w-[85%] rounded px-2 py-1.5 bg-black/45 backdrop-blur-sm">{video.title}</h3>
          </div>

        </div>
      </motion.div>

      {/* Info below card */}
      <div className="flex items-center justify-between gap-2 pt-[14px] pb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CompanyLink
            company={video.company}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted shrink-0 hover:text-foreground transition-colors"
          />
          <span className="text-xs text-foreground truncate">{video.title}</span>
        </div>
        {isGhost ? (
          <span className="text-xs text-muted shrink-0 font-mono">Soon</span>
        ) : (
          <span className="text-xs text-muted shrink-0 font-mono">{formatDuration(video.duration)}</span>
        )}
      </div>
    </article>
  )
})
