'use client'

import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react'
import { motion } from 'framer-motion'
import { Chapter, Video } from '@/types/video'
import { getChaptersForVideo } from '@/data/chapters'
import { sizedThumbnail, platformName } from '@/lib/utils'
import { CompanyLink } from '@/components/ui/company-link'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { VideoPlayer, VideoPlayerHandle, QualityLevel } from './modal/video-player'
import { PlayerControls } from './modal/player-controls'
import { VideoMetrics } from './video-metrics'
import { useIntroContext } from '@/context/intro-context'
import { trackGoal, GOALS } from '@/lib/analytics'
import { usePageVisible } from '@/hooks/use-page-visible'
import { useWatchTime } from '@/hooks/use-watch-time'

const SHARED_LAYOUT_TRANSITION = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const
const SWIPE_CLOSE_THRESHOLD = 56
const WHEEL_CLOSE_THRESHOLD = 140
const WHEEL_RESET_MS = 180
// Expanded box sizing per aspect ratio. Width is capped by viewport width and
// by the height available (100svh − chrome), converted via the ratio so the
// box always fits on screen whatever its shape.
function expandedWidth(aspectRatio: Video['aspectRatio']): string {
  switch (aspectRatio) {
    case '1:1':
      return 'min(880px, calc(100vw - 2rem), calc(100svh - 7rem))'
    case '9:16':
      return 'min(520px, calc(100vw - 2rem), calc((100svh - 7rem) * 9 / 16))'
    case '4:5':
      return 'min(700px, calc(100vw - 2rem), calc((100svh - 7rem) * 4 / 5))'
    default:
      return 'min(1254px, calc(100vw - 2rem), calc((100svh - 7rem) * 16 / 9))'
  }
}

function aspectClass(aspectRatio: Video['aspectRatio']): string {
  switch (aspectRatio) {
    case '1:1':
      return 'aspect-square'
    case '9:16':
      return 'aspect-[9/16]'
    case '4:5':
      return 'aspect-[4/5]'
    default:
      return 'aspect-video'
  }
}

interface VideoCardProps {
  video: Video
  onSelect?: (video: Video) => void
  onClose?: () => void
  isExpanded?: boolean
  instant?: boolean
  disablePlayback?: boolean
  /** Mount + pre-upscale this card even off-screen (e.g. arrow-nav neighbours). */
  preload?: boolean
  /** Another card is focused — pause this player's loading to free bandwidth. */
  backgrounded?: boolean
}

export const VideoCard = memo(function VideoCard({
  video,
  onSelect,
  onClose,
  isExpanded = false,
  instant = false,
  disablePlayback = false,
  preload = false,
  backgrounded = false,
}: VideoCardProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const wheelDeltaRef = useRef(0)

  const isGhost = !video.videoUrl
  const isInteractive = !isGhost && !disablePlayback
  const chapters: Chapter[] = getChaptersForVideo(video.id)
  const { shouldShowIntro, introComplete, registerMedia, markMediaLoaded } = useIntroContext()
  const pageVisible = usePageVisible()

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [inView, setInView] = useState(false)
  // Whether the card is *currently* near the viewport. Unlike `inView` (which
  // latches true on first sight to keep the player mounted), this toggles as the
  // card scrolls in and out so we can pause off-screen previews.
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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

  // Mount the HLS player as soon as the card nears the viewport so above-the-
  // fold previews all load in parallel (fastest first paint). Expanded or
  // preloaded (arrow-nav) cards always mount. Once started, stay mounted to
  // avoid reload churn while scrolling.
  const shouldMountPlayer = isInteractive && (inView || isExpanded || preload)

  // Pre-fetch the sharp rendition on hover, while expanded, or when queued as
  // an arrow-nav neighbour — so it's already high-quality by the time it fills
  // the screen instead of visibly ramping up afterwards.
  const wantsHighRes = isInteractive && (isHovered || isExpanded || preload)
  useEffect(() => {
    playerRef.current?.setUpscale(wantsHighRes)
  }, [wantsHighRes, videoEl])

  useEffect(() => {
    if (!isInteractive) return
    const el = slotRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        setIsVisible(entry.isIntersecting)
        if (entry.isIntersecting) setInView(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isInteractive])

  // A grid preview should only run when it's actually worth running: on-screen,
  // in a foregrounded tab, and not hidden behind an open modal. Players stay
  // mounted to avoid reload churn, but otherwise we pause — without this a long
  // grid keeps every <video> it has ever shown looping at once (progressive
  // jank), and a backgrounded tab keeps decoding forever. The matching
  // `backgrounded` prop below also halts Mux fetching in these states, so an
  // idle tab streams ~nothing. Expanded cards are exempt — they're being watched.
  // A mounted preview only plays while it's worth it: on-screen, foregrounded
  // tab, not behind an open modal. Pausing is always safe (unlike stopLoad).
  const previewActive = isVisible && pageVisible && !backgrounded
  useEffect(() => {
    if (!videoEl || isExpanded) return
    if (previewActive) videoEl.play().catch(() => {})
    else videoEl.pause()
  }, [videoEl, isExpanded, previewActive])

  // Grab the underlying <video> element once VideoPlayer has mounted.
  useEffect(() => {
    if (!shouldMountPlayer) return
    const el = playerRef.current?.getVideoElement() ?? null
    videoElRef.current = el
    setVideoEl(el)
  }, [shouldMountPlayer, video.id])

  // Register on-screen previews with the intro so it can hold the reveal until
  // they've painted. Only matters during a first-visit intro.
  useEffect(() => {
    if (!shouldMountPlayer || !shouldShowIntro || introComplete) return
    registerMedia(video.id)
  }, [shouldMountPlayer, shouldShowIntro, introComplete, video.id, registerMedia])

  // Fade the thumbnail image once the video paints its first frame.
  useEffect(() => {
    if (!videoEl) return
    const mark = () => {
      setHasRenderedFrame(true)
      markMediaLoaded(video.id)
    }
    if (videoEl.readyState >= 2) mark()
    videoEl.addEventListener('loadeddata', mark)
    videoEl.addEventListener('playing', mark)
    return () => {
      videoEl.removeEventListener('loadeddata', mark)
      videoEl.removeEventListener('playing', mark)
    }
  }, [videoEl, video.id, markMediaLoaded])

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

  // Analytics: a real "watch" (video_play) and "watched to the end"
  // (video_complete), scoped to the expanded player so grid-preview autoplay and
  // looping don't pollute the data. Each fires once per expand session; reset
  // when the card collapses so re-opening counts as a fresh watch.
  const playTrackedRef = useRef(false)
  const completeTrackedRef = useRef(false)
  useEffect(() => {
    if (!isExpanded) {
      playTrackedRef.current = false
      completeTrackedRef.current = false
      return
    }
    if (!videoEl) return

    const meta = {
      video_id: video.id,
      company: video.companySlug,
      slug: video.slug,
    }

    const handlePlay = () => {
      if (playTrackedRef.current) return
      playTrackedRef.current = true
      trackGoal(GOALS.videoPlay, meta)
    }

    // The player loops internally by seeking to 0 on `ended`, so `ended` is
    // unreliable here — detect completion when playback crosses ~98% instead.
    const handleTimeUpdate = () => {
      if (completeTrackedRef.current) return
      const { currentTime, duration } = videoEl
      if (!Number.isFinite(duration) || duration <= 0) return
      if (currentTime / duration >= 0.98) {
        completeTrackedRef.current = true
        trackGoal(GOALS.videoComplete, meta)
      }
    }

    videoEl.addEventListener('play', handlePlay)
    videoEl.addEventListener('timeupdate', handleTimeUpdate)
    // Catch the case where it's already playing the moment we expand.
    if (!videoEl.paused) handlePlay()
    return () => {
      videoEl.removeEventListener('play', handlePlay)
      videoEl.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [isExpanded, videoEl, video.id, video.companySlug, video.slug])

  // Accumulate engaged watch-time for the future "Popular" ranking — the one
  // signal that can't be backfilled. Reports increments to /api/watch.
  useWatchTime(video, videoEl, isExpanded)

  // Opening via keyboard navigation swaps to a card that was looping off-screen
  // in the grid, so it "appears from nowhere" mid-playback. Restart it from the
  // top in that case. A direct click keeps its position so the morph from the
  // visible grid frame stays seamless.
  useEffect(() => {
    if (!isExpanded || !instant) return
    const el = videoElRef.current
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
  }, [isExpanded, instant])

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

  // Spacebar toggles play/pause while expanded. Arrow navigation (see
  // use-expanded-video) already listens on `window`, but space previously only
  // worked after a click had focused the overlay button — natively activating
  // it. Handle it globally so it works the moment a video opens. Skip when an
  // interactive element is focused so we don't double-fire or hijack its space.
  useEffect(() => {
    if (!isExpanded) return
    const handleSpace = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, a, input, select, textarea')) return
      event.preventDefault()
      togglePlay()
    }
    window.addEventListener('keydown', handleSpace)
    return () => window.removeEventListener('keydown', handleSpace)
  }, [isExpanded, togglePlay])

  const handleQualityChange = useCallback((index: number) => {
    playerRef.current?.setQuality(index)
    setCurrentQuality(index)
  }, [])

  const handleSelect = useCallback(() => {
    // The intro overlay is pointer-events-none, so stray clicks during the
    // supercut would fall through and expand a card behind it — audio starts
    // with no video visible. Swallow selection until the intro is done.
    if (shouldShowIntro && !introComplete) return
    if (!isInteractive || isExpanded) return
    onSelect?.(video)
  }, [shouldShowIntro, introComplete, isInteractive, isExpanded, onSelect, video])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Only act as an "open this card" trigger when no modal is open. After
    // arrow-navigating away, this card collapses but keeps DOM focus — without
    // the `backgrounded` guard, Space would re-open it and yank the modal back
    // to the video you started on.
    if ((event.key === 'Enter' || event.key === ' ') && isInteractive && !isExpanded && !backgrounded) {
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
    ...(isExpanded ? { width: expandedWidth(video.aspectRatio) } : {}),
  }

  return (
    <article
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => isInteractive && setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className={`group relative ${isInteractive ? 'cursor-pointer' : ''} ${elevated ? 'z-[130]' : 'hover:z-20'} ${isExpanded ? 'pointer-events-none' : ''}`}
    >
      {/* Reserved grid slot — keeps layout stable while the box expands.
          data-supercut-media: the intro's pieces land on THIS 16:9 box, not
          the whole cell — the meta row below is not part of the video. */}
      <div ref={slotRef} data-supercut-media="true" className="relative aspect-video w-full">
        <motion.div
          ref={boxRef}
          layout
          transition={instant ? { duration: 0 } : SHARED_LAYOUT_TRANSITION}
          onLayoutAnimationComplete={() => { if (!isExpanded) setIsCollapsing(false) }}
          // Lift & pop on hover (collapsed only): a subtle scale composes with
          // the layout transform, while the shadow/ring are driven by CSS below.
          whileHover={isInteractive && !isExpanded ? { scale: 1.01 } : undefined}
          style={boxStyle}
          onTouchStartCapture={handleTouchStart}
          onTouchMoveCapture={handleTouchMove}
          onTouchEndCapture={handleTouchEnd}
          className={
            isExpanded
              ? `fixed inset-0 z-[130] m-auto ${aspectClass(video.aspectRatio)} overflow-hidden bg-surface isolate shadow-2xl pointer-events-auto`
              : 'absolute inset-0 overflow-hidden bg-surface isolate transition-shadow duration-300 group-hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(0,0,0,0.2),inset_0_0_0_1px_rgba(255,255,255,0.28)]'
          }
        >
          {isGhost ? (
            <div className="absolute inset-0 bg-surface" />
          ) : disablePlayback ? (
            <img
              src={sizedThumbnail(video.thumbnailUrl, 960)}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <img
                src={sizedThumbnail(video.thumbnailUrl, 640)}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-150 ${
                  hasRenderedFrame ? 'opacity-0' : 'opacity-100'
                }`}
              />
              {shouldMountPlayer && (
                <VideoPlayer
                  ref={playerRef}
                  src={video.videoUrl}
                  startMuted={!isExpanded}
                  expanded={isExpanded}
                  backgrounded={
                    // Only ever freeze loading AFTER the first frame has painted
                    // — calling stopLoad before the manifest parses leaves HLS.js
                    // stuck. Before paint, let it finish; after, stop fetching
                    // when off-screen, behind a modal, or in a backgrounded tab.
                    hasRenderedFrame &&
                    (backgrounded || (!isExpanded && !preload && (!isVisible || !pageVisible)))
                  }
                  onQualityLevelsChange={setQualityLevels}
                  className="absolute inset-0 z-10 !rounded-none"
                />
              )}
            </>
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
                  <div className="flex items-center gap-2">
                    <span className="w-fit text-[10px] text-white/80 tracking-widest uppercase font-mono rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.company}</span>
                    <VideoMetrics sourceUrl={video.sourceUrl} />
                  </div>
                  <h2 className="w-fit max-w-[85%] mt-1 text-sm sm:text-base font-light text-white tracking-tight rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.title}</h2>
                </div>
                <div className="flex items-center gap-2 pointer-events-auto">
                  {video.sourceUrl && (
                    <a
                      href={video.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        event.stopPropagation()
                        trackGoal(GOALS.outboundPost, {
                          video_id: video.id,
                          company: video.companySlug,
                          slug: video.slug,
                        })
                      }}
                      className="h-7 px-3 text-xs rounded-full bg-black/45 text-white border border-white/20 hover:bg-black/55 inline-flex items-center justify-center font-medium transition-colors"
                    >
                      View on {platformName(video.sourceUrl)}
                    </a>
                  )}
                  {video.websiteUrl && (
                    <a
                      href={video.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        event.stopPropagation()
                        trackGoal(GOALS.outboundVisit, {
                          video_id: video.id,
                          company: video.companySlug,
                          slug: video.slug,
                        })
                      }}
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

      {/* Info below card — hidden while expanded so it doesn't float above the backdrop */}
      <div className={`flex items-center justify-between gap-2 pt-[14px] pb-1.5 ${isExpanded ? 'invisible' : ''}`}>
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
          <VideoMetrics sourceUrl={video.sourceUrl} variant="inline" />
        )}
      </div>
    </article>
  )
})
