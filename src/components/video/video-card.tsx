'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent, type WheelEvent } from 'react'
import Hls from 'hls.js'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { Video } from '@/types/video'
import { formatDuration } from '@/lib/utils'
import { CompanyLink } from '@/components/ui/company-link'
import { PlayerControls } from './modal/player-controls'
import { getChaptersForVideo } from '@/data/chapters'

const EXPAND_DURATION_MS = 320
const SWIPE_CLOSE_THRESHOLD = 56
const WHEEL_CLOSE_THRESHOLD = 140
const WHEEL_RESET_MS = 180

interface VideoCardProps {
  video: Video
  onSelect: (video: Video, startTime?: number, handoffVideoElement?: HTMLVideoElement | null) => void
  disablePlayback?: boolean
  isExpanded?: boolean
  hasExpandedVideo?: boolean
  onClose?: () => void
}

function getAspectRatio(video: Video) {
  if (video.aspectRatio === '9:16') {
    return { width: 9, height: 16 }
  }
  return { width: 16, height: 9 }
}

export const VideoCard = memo(function VideoCard({
  video,
  onSelect,
  disablePlayback = false,
  isExpanded = false,
  hasExpandedVideo = false,
  onClose,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const wheelDeltaRef = useRef(0)
  const wheelResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isGhost = !video.videoUrl
  const chapters = getChaptersForVideo(video.id)
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const [lastAction, setLastAction] = useState<'play' | 'pause'>('play')
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const wasExpandedRef = useRef(false)

  const isFloating = isExpanded || isClosing

  useEffect(() => {
    setHasRenderedFrame(false)
    setIsPlaying(true)
    setShowPlayIcon(false)
    setOriginRect(null)
    setIsClosing(false)
    wasExpandedRef.current = false
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
    }

    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = video.videoUrl
      videoEl.play().catch(() => {})
    }
  }, [video.videoUrl, isGhost, disablePlayback])

  useEffect(() => {
    if (isGhost || disablePlayback) return
    const videoEl = videoRef.current
    if (!videoEl) return

    const markRendered = () => setHasRenderedFrame(true)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    if (videoEl.readyState >= 2) {
      setHasRenderedFrame(true)
    }

    videoEl.addEventListener('loadeddata', markRendered)
    videoEl.addEventListener('playing', markRendered)
    videoEl.addEventListener('play', handlePlay)
    videoEl.addEventListener('pause', handlePause)
    setIsPlaying(!videoEl.paused)

    return () => {
      videoEl.removeEventListener('loadeddata', markRendered)
      videoEl.removeEventListener('playing', markRendered)
      videoEl.removeEventListener('play', handlePlay)
      videoEl.removeEventListener('pause', handlePause)
    }
  }, [video.id, isGhost, disablePlayback])

  useEffect(() => {
    if (isExpanded) {
      wasExpandedRef.current = true
      setIsClosing(false)

      if (!originRect && containerRef.current) {
        setOriginRect(containerRef.current.getBoundingClientRect())
      }

      const videoEl = videoRef.current
      if (videoEl) {
        videoEl.muted = false
        videoEl.loop = false
        videoEl.play().catch(() => {})
      }
      return
    }

    if (!wasExpandedRef.current) return

    const videoEl = videoRef.current
    if (videoEl) {
      videoEl.muted = true
      videoEl.loop = true
    }

    setIsClosing(true)
    const timeout = setTimeout(() => {
      setIsClosing(false)
      setOriginRect(null)
      wasExpandedRef.current = false
    }, EXPAND_DURATION_MS)

    return () => clearTimeout(timeout)
  }, [isExpanded, originRect])

  useEffect(() => {
    if (!isFloating) return

    const body = document.body
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const previousBodyStyle = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    }

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = previousBodyStyle.overflow
      body.style.paddingRight = previousBodyStyle.paddingRight
    }
  }, [isFloating])

  useEffect(() => {
    if (!isFloating) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isFloating, onClose])

  const resetWheelAccumulator = useCallback(() => {
    wheelDeltaRef.current = 0
    if (wheelResetTimeoutRef.current) {
      clearTimeout(wheelResetTimeoutRef.current)
      wheelResetTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      resetWheelAccumulator()
    }
  }, [resetWheelAccumulator])

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
    if (!isExpanded || !touchStartRef.current || event.touches.length !== 1) return
    const touch = event.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    if (closeForVerticalGesture(deltaX, deltaY)) {
      touchStartRef.current = null
    }
  }, [isExpanded, closeForVerticalGesture])

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!isExpanded || !touchStartRef.current || event.changedTouches.length !== 1) return
    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    touchStartRef.current = null
    closeForVerticalGesture(deltaX, deltaY)
  }, [isExpanded, closeForVerticalGesture])

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!isExpanded) return
    if (event.ctrlKey) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

    wheelDeltaRef.current += event.deltaY
    if (wheelResetTimeoutRef.current) {
      clearTimeout(wheelResetTimeoutRef.current)
    }
    wheelResetTimeoutRef.current = setTimeout(() => {
      wheelDeltaRef.current = 0
      wheelResetTimeoutRef.current = null
    }, WHEEL_RESET_MS)

    if (Math.abs(wheelDeltaRef.current) >= WHEEL_CLOSE_THRESHOLD) {
      resetWheelAccumulator()
      onClose?.()
    }
  }, [isExpanded, onClose, resetWheelAccumulator])

  const handleSelect = useCallback(() => {
    if (isGhost || isExpanded || hasExpandedVideo) return

    if (containerRef.current) {
      setOriginRect(containerRef.current.getBoundingClientRect())
    }

    const currentTime = videoRef.current?.currentTime ?? 0
    onSelect(video, Number.isFinite(currentTime) ? currentTime : 0, videoRef.current)
  }, [isGhost, isExpanded, hasExpandedVideo, onSelect, video])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !isGhost) {
      event.preventDefault()
      handleSelect()
    }
  }

  const togglePlay = useCallback(() => {
    const videoEl = videoRef.current
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
  }, [])

  const floatingStyle = useMemo((): CSSProperties => {
    if (!isFloating || !originRect) return {}

    const { width: ratioW, height: ratioH } = getAspectRatio(video)
    const viewportPadding = 16
    const maxWidth = Math.min(1254, window.innerWidth - viewportPadding * 2)
    const maxHeight = Math.max(240, window.innerHeight - 96)

    let expandedWidth = maxWidth
    let expandedHeight = (expandedWidth * ratioH) / ratioW
    if (expandedHeight > maxHeight) {
      expandedHeight = maxHeight
      expandedWidth = (expandedHeight * ratioW) / ratioH
    }

    const sourceCenterX = originRect.left + originRect.width / 2
    const sourceCenterY = originRect.top + originRect.height / 2
    const targetCenterX = window.innerWidth / 2
    const targetCenterY = window.innerHeight / 2

    const translateX = targetCenterX - sourceCenterX
    const translateY = targetCenterY - sourceCenterY
    const scale = expandedWidth / originRect.width

    return {
      position: 'fixed',
      top: `${originRect.top}px`,
      left: `${originRect.left}px`,
      width: `${originRect.width}px`,
      zIndex: 140,
      transformOrigin: 'top left',
      transform: isExpanded ? `translate(${translateX}px, ${translateY}px) scale(${scale})` : 'translate(0px, 0px) scale(1)',
      transition: `transform ${EXPAND_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), border-radius ${EXPAND_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow ${EXPAND_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      boxShadow: isExpanded ? '0 30px 90px rgba(0,0,0,0.45)' : 'none',
    }
  }, [isFloating, originRect, isExpanded, video])

  return (
    <>
      {isFloating && (
        <div
          className={`fixed inset-0 z-[120] bg-background/90 backdrop-blur-lg transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
      )}

      <article
        role={isGhost ? undefined : 'button'}
        tabIndex={isGhost ? undefined : 0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={`group ${isGhost ? '' : 'cursor-pointer'}`}
      >
        <div
          ref={containerRef}
          style={floatingStyle}
          onTouchStartCapture={handleTouchStart}
          onTouchMoveCapture={handleTouchMove}
          onTouchEndCapture={handleTouchEnd}
          onWheelCapture={handleWheel}
          className={`relative aspect-video w-full rounded-[6px] overflow-hidden isolate ${!isFloating ? 'group-hover:ring-1 group-hover:ring-foreground/10' : ''}`}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[6px] bg-surface">
            {isGhost ? (
              <div className="absolute inset-0 bg-surface" />
            ) : disablePlayback ? (
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
                  className={`absolute inset-0 z-20 h-full w-full object-cover rounded-[6px] transition-opacity duration-150 ${hasRenderedFrame ? 'opacity-0' : 'opacity-100'}`}
                />
                <video
                  ref={videoRef}
                  muted={!isExpanded}
                  loop={!isExpanded}
                  playsInline
                  className="absolute inset-0 z-10 h-full w-full object-cover rounded-[6px]"
                />
              </>
            )}

            {!isExpanded && (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-start p-3 md:p-5 pointer-events-none hidden md:flex">
                <span className="text-[10px] md:text-xs text-white/90 tracking-widest uppercase font-mono w-fit rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.company}</span>
                <h3 className="text-lg md:text-2xl font-light text-white tracking-tight line-clamp-2 mt-1 md:mt-2 w-fit max-w-[85%] rounded px-2 py-1.5 bg-black/45 backdrop-blur-sm">{video.title}</h3>
              </div>
            )}

            {isExpanded && (
              <>
                <div className="absolute top-3 left-3 right-3 z-30 flex items-start justify-between pointer-events-none">
                  <div className="pointer-events-none">
                    <span className="text-[10px] text-white/80 tracking-widest uppercase font-mono w-fit rounded px-2 py-1 bg-black/45 backdrop-blur-sm block">{video.company}</span>
                    <h3 className="text-sm sm:text-base text-white tracking-tight mt-1 w-fit max-w-[85%] rounded px-2 py-1 bg-black/45 backdrop-blur-sm">{video.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {video.websiteUrl && (
                      <a
                        href={video.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-3 text-xs rounded-full bg-black/45 text-white border border-white/20 hover:bg-black/55 inline-flex items-center justify-center font-medium transition-colors"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Visit
                      </a>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        onClose?.()
                      }}
                      className="w-7 h-7 rounded-full bg-black/45 text-white border border-white/20 hover:bg-black/55 inline-flex items-center justify-center text-sm"
                      aria-label="Close video"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <button
                  onClick={togglePlay}
                  className="absolute inset-0 bottom-20 z-30 w-full cursor-pointer bg-transparent"
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                />

                {showPlayIcon && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 flex items-center justify-center">
                      {lastAction === 'play' ? (
                        <PlayIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      ) : (
                        <PauseIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      )}
                    </div>
                  </div>
                )}

                <PlayerControls
                  videoRef={videoRef}
                  duration={video.duration}
                  chapters={chapters}
                  containerRef={containerRef}
                />
              </>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-between gap-2 pt-[14px] pb-1.5 transition-opacity duration-200 ${isFloating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CompanyLink
              company={video.company}
              onClick={(event) => event.stopPropagation()}
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
    </>
  )
})
