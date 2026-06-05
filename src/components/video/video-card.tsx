'use client'

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import { Video } from '@/types/video'
import { formatDuration } from '@/lib/utils'
import { CompanyLink } from '@/components/ui/company-link'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { VideoPlayer, VideoPlayerHandle, QualityLevel } from './modal/video-player'
import { PlayerControls } from './modal/player-controls'
import { getChaptersForVideo } from '@/data/chapters'

const SHARED_LAYOUT_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const
const SWIPE_CLOSE_THRESHOLD = 56
const WHEEL_CLOSE_THRESHOLD = 140
const WHEEL_RESET_MS = 180
const EXPANDED_WIDTH = 'min(1254px, calc(100vw - 2rem), calc((100svh - 7rem) * 16 / 9))'

interface VideoCardProps {
  video: Video
  onSelect?: (video: Video) => void
  onClose?: () => void
  isExpanded?: boolean
  instant?: boolean
  disablePlayback?: boolean
}

export const VideoCard = memo(function VideoCard({
  video,
  onSelect,
  onClose,
  isExpanded = false,
  instant = false,
  disablePlayback = false,
}: VideoCardProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const wheelDeltaRef = useRef(0)

  const isGhost = !video.videoUrl
  const isInteractive = !isGhost && !disablePlayback
  const chapters = getChaptersForVideo(video.id)

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const [lastAction, setLastAction] = useState<'play' | 'pause'>('play')
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1)
  // Keeps the page locked through trackpad momentum after a scroll-to-close.
  const [momentumGuard, setMomentumGuard] = useState(false)
  // Stay stacked above sibling cards until the collapse animation finishes,
  // otherwise the card morphs back *under* the cards that follow it.
  const [isCollapsing, setIsCollapsing] = useState(false)
  const prevExpandedRef = useRef(isExpanded)
  if (prevExpandedRef.current !== isExpanded) {
    prevExpandedRef.current = isExpanded
    // An instant (navigation) collapse snaps straight to the slot, so there's
    // no morph that could pass under sibling cards — no need to stay elevated.
    if (!isExpanded && !instant) setIsCollapsing(true)
  }
  const elevated = isExpanded || isCollapsing

  // Grab the underlying <video> element once VideoPlayer has mounted.
  useEffect(() => {
    if (!isInteractive) return
    const el = playerRef.current?.getVideoElement() ?? null
    videoElRef.current = el
    setVideoEl(el)
  }, [isInteractive, video.id])

  // Fade the thumbnail image once the video paints its first frame.
  useEffect(() => {
    if (!videoEl) return
    if (videoEl.readyState >= 2) setHasRenderedFrame(true)
    const mark = () => setHasRenderedFrame(true)
    videoEl.addEventListener('loadeddata', mark)
    videoEl.addEventListener('playing', mark)
    return () => {
      videoEl.removeEventListener('loadeddata', mark)
      videoEl.removeEventListener('playing', mark)
    }
  }, [videoEl])

  // Mirror play/pause state for the expanded controls overlay.
  useEffect(() => {
    if (!videoEl) return
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    videoEl.addEventListener('play', handlePlay)
    videoEl.addEventListener('pause', handlePause)
    setIsPlaying(!videoEl.paused)
    return () => {
      videoEl.removeEventListener('play', handlePlay)
      videoEl.removeEventListener('pause', handlePause)
    }
  }, [videoEl])

  // Handle Escape while expanded.
  useEffect(() => {
    if (!isExpanded) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isExpanded, onClose])

  // Lock body scroll while expanded — and keep it locked briefly after a
  // scroll-to-close so leftover trackpad momentum doesn't scroll the page.
  useEffect(() => {
    if (!isExpanded && !momentumGuard) return

    const body = document.body
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [isExpanded, momentumGuard])

  const togglePlay = useCallback(() => {
    if (!videoEl) return
    if (videoEl.paused) {
      videoEl.play().catch(() => {})
      setLastAction('play')
    } else {
      videoEl.pause()
      setLastAction('pause')
    }
    setShowPlayIcon(true)
    window.setTimeout(() => setShowPlayIcon(false), 500)
  }, [videoEl])

  const handleQualityChange = useCallback((index: number) => {
    playerRef.current?.setQuality(index)
    setCurrentQuality(index)
  }, [])

  const handleSelect = useCallback(() => {
    if (!isInteractive || isExpanded) return
    onSelect?.(video)
  }, [isInteractive, isExpanded, onSelect, video])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && isInteractive && !isExpanded) {
      event.preventDefault()
      handleSelect()
    }
  }

  // Vertical swipe / wheel to dismiss while expanded.
  const closeForVerticalGesture = useCallback((deltaX: number, deltaY: number) => {
    if (!isExpanded) return false
    if (Math.abs(deltaY) < SWIPE_CLOSE_THRESHOLD) return false
    if (Math.abs(deltaY) <= Math.abs(deltaX)) return false
    onClose?.()
    return true
  }, [isExpanded, onClose])

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!isExpanded || event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [isExpanded])

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    if (!start || event.touches.length !== 1) return
    const touch = event.touches[0]
    if (closeForVerticalGesture(touch.clientX - start.x, touch.clientY - start.y)) {
      touchStartRef.current = null
    }
  }, [closeForVerticalGesture])

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start || event.changedTouches.length !== 1) return
    const touch = event.changedTouches[0]
    closeForVerticalGesture(touch.clientX - start.x, touch.clientY - start.y)
  }, [closeForVerticalGesture])

  // After a scroll-to-close, hold the scroll lock until the trackpad momentum
  // dies down. The page can't scroll while `body` stays `overflow: hidden`, so
  // the leftover inertia is absorbed instead of leaking into the page. Runs
  // independently of `isExpanded` so it survives the close it triggers.
  const guardScrollMomentum = useCallback(() => {
    setMomentumGuard(true)
    let idle = setTimeout(end, 200)
    const bump = () => {
      clearTimeout(idle)
      idle = setTimeout(end, 120)
    }
    function end() {
      clearTimeout(idle)
      window.removeEventListener('wheel', bump)
      setMomentumGuard(false)
    }
    window.addEventListener('wheel', bump, { passive: true })
  }, [])

  // Detect a vertical scroll-to-close gesture while expanded.
  useEffect(() => {
    if (!isExpanded) return
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

      wheelDeltaRef.current += event.deltaY
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => { wheelDeltaRef.current = 0 }, WHEEL_RESET_MS)

      if (Math.abs(wheelDeltaRef.current) >= WHEEL_CLOSE_THRESHOLD) {
        wheelDeltaRef.current = 0
        guardScrollMomentum()
        onClose?.()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      clearTimeout(resetTimer)
    }
  }, [isExpanded, onClose, guardScrollMomentum])

  const boxStyle: CSSProperties = {
    borderRadius: isExpanded ? 12 : 6,
    ...(isExpanded ? { width: EXPANDED_WIDTH } : {}),
  }

  return (
    <article
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={`group ${isInteractive ? 'cursor-pointer' : ''} ${elevated ? 'relative z-[130]' : ''} ${isExpanded ? 'pointer-events-none' : ''}`}
    >
      {/* Reserved grid slot — keeps layout stable while the box expands */}
      <div className="relative aspect-video w-full">
        <motion.div
          ref={boxRef}
          layout
          transition={instant ? { duration: 0 } : SHARED_LAYOUT_TRANSITION}
          onLayoutAnimationComplete={() => { if (!isExpanded) setIsCollapsing(false) }}
          style={boxStyle}
          onTouchStartCapture={handleTouchStart}
          onTouchMoveCapture={handleTouchMove}
          onTouchEndCapture={handleTouchEnd}
          className={
            isExpanded
              ? 'fixed inset-0 z-[130] m-auto aspect-video overflow-hidden bg-surface isolate shadow-2xl pointer-events-auto'
              : 'absolute inset-0 overflow-hidden bg-surface isolate group-hover:ring-1 group-hover:ring-foreground/10'
          }
        >
          {isGhost ? (
            <div className="absolute inset-0 bg-surface" />
          ) : disablePlayback ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <img
                src={video.thumbnailUrl}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-150 ${
                  hasRenderedFrame ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <VideoPlayer
                ref={playerRef}
                src={video.videoUrl}
                startMuted={!isExpanded}
                onQualityLevelsChange={setQualityLevels}
                className="absolute inset-0 z-10 !rounded-none"
              />
            </>
          )}

          {/* Hover labels (collapsed only) */}
          {isInteractive && !isExpanded && (
            <div className="absolute inset-0 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-start p-3 md:p-5 pointer-events-none hidden md:flex">
              <span className="text-[10px] md:text-xs text-white/90 tracking-widest uppercase font-mono w-fit rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.company}</span>
              <h3 className="text-lg md:text-2xl font-light text-white tracking-tight line-clamp-2 mt-1 md:mt-2 w-fit max-w-[85%] rounded px-2 py-1.5 bg-black/45 backdrop-blur-sm">{video.title}</h3>
            </div>
          )}

          {/* Expanded chrome */}
          {isExpanded && (
            <>
              {/* Click-to-toggle overlay (excludes bottom controls) */}
              <button
                onClick={togglePlay}
                className="absolute inset-x-0 top-0 bottom-20 z-30 w-full cursor-pointer bg-transparent"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              />

              {/* Title + actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.2 }}
                className="absolute top-3 left-3 right-3 z-40 flex items-start justify-between gap-3 pointer-events-none"
              >
                <div>
                  <span className="block w-fit text-[10px] text-white/80 tracking-widest uppercase font-mono rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.company}</span>
                  <h2 className="w-fit max-w-[85%] mt-1 text-sm sm:text-base font-light text-white tracking-tight rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.title}</h2>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                  {video.websiteUrl && (
                    <a
                      href={video.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="h-7 px-3 text-xs rounded-full bg-black/45 text-white border border-white/20 hover:bg-black/55 inline-flex items-center justify-center font-medium transition-colors"
                    >
                      Visit
                    </a>
                  )}
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onClose?.()
                    }}
                    className="w-7 h-7 rounded-full bg-black/45 text-white border border-white/20 hover:bg-black/55 inline-flex items-center justify-center text-base leading-none"
                    aria-label="Close video"
                  >
                    ×
                  </button>
                </div>
              </motion.div>

              {/* Play/pause feedback */}
              {showPlayIcon && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 flex items-center justify-center">
                    {lastAction === 'play' ? (
                      <PlayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    ) : (
                      <PauseIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    )}
                  </div>
                </motion.div>
              )}

              {videoEl && (
                <PlayerControls
                  videoRef={videoElRef}
                  duration={video.duration}
                  chapters={chapters}
                  containerRef={boxRef}
                  qualityLevels={qualityLevels}
                  currentQuality={currentQuality}
                  onQualityChange={handleQualityChange}
                />
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Info below card */}
      <div className="flex items-center justify-between gap-2 pt-[14px] pb-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CompanyLink
            company={video.company}
            companySlug={video.companySlug}
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
