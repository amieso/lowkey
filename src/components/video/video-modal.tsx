'use client'

import { useEffect, useCallback, useRef, useState, type TouchEvent, type WheelEvent } from 'react'
import { motion } from 'framer-motion'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { Video } from '@/types/video'
import { VideoPlayer, VideoPlayerHandle, QualityLevel } from './modal/video-player'
import { PlayerControls } from './modal/player-controls'
import { getChaptersForVideo } from '@/data/chapters'

interface VideoModalProps {
  video: Video
  onClose: () => void
}

const SWIPE_CLOSE_THRESHOLD = 56
const WHEEL_CLOSE_THRESHOLD = 140
const WHEEL_RESET_MS = 180
const SHARED_LAYOUT_SPRING = { type: 'spring', stiffness: 340, damping: 34, mass: 0.8 } as const

export function VideoModal({ video, onClose }: VideoModalProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const wheelDeltaRef = useRef(0)
  const wheelResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showPlayIcon, setShowPlayIcon] = useState(false)
  const [lastAction, setLastAction] = useState<'play' | 'pause'>('play')
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1)
  const chapters = getChaptersForVideo(video.id)

  const handleQualityChange = useCallback((index: number) => {
    playerRef.current?.setQuality(index)
    setCurrentQuality(index)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoElement
    if (!video) return

    if (video.paused) {
      video.play().catch(() => {})
      setIsPlaying(true)
      setLastAction('play')
    } else {
      video.pause()
      setIsPlaying(false)
      setLastAction('pause')
    }

    // Show icon briefly
    setShowPlayIcon(true)
    setTimeout(() => setShowPlayIcon(false), 500)
  }, [videoElement])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    const scrollY = window.scrollY
    const body = document.body
    const previousBodyStyle = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      body.style.overflow = previousBodyStyle.overflow
      body.style.position = previousBodyStyle.position
      body.style.top = previousBodyStyle.top
      body.style.left = previousBodyStyle.left
      body.style.right = previousBodyStyle.right
      body.style.width = previousBodyStyle.width
      window.scrollTo(0, scrollY)
    }
  }, [handleEscape])

  // Get video element reference after mount and sync play state
  useEffect(() => {
    const checkVideoElement = () => {
      const el = playerRef.current?.getVideoElement()
      if (el) {
        videoElementRef.current = el
        setVideoElement(el)
      }
    }
    // Small delay to ensure player is mounted
    const timeout = setTimeout(checkVideoElement, 100)
    return () => clearTimeout(timeout)
  }, [video.id])

  // Sync isPlaying state with actual video state
  useEffect(() => {
    if (!videoElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    // Set initial state
    setIsPlaying(!videoElement.paused)

    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement])

  const shouldCloseForVerticalGesture = useCallback(
    (deltaX: number, deltaY: number) => {
      if (Math.abs(deltaY) < SWIPE_CLOSE_THRESHOLD) return false
      if (Math.abs(deltaY) <= Math.abs(deltaX)) return false
      onClose()
      return true
    },
    [onClose]
  )

  const resetWheelAccumulator = useCallback(() => {
    wheelDeltaRef.current = 0
    if (wheelResetTimeoutRef.current) {
      clearTimeout(wheelResetTimeoutRef.current)
      wheelResetTimeoutRef.current = null
    }
  }, [])

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current
      if (!start || event.touches.length !== 1) return

      const touch = event.touches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      if (shouldCloseForVerticalGesture(deltaX, deltaY)) {
        touchStartRef.current = null
      }
    },
    [shouldCloseForVerticalGesture]
  )

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current
      touchStartRef.current = null
      if (!start || event.changedTouches.length !== 1) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      shouldCloseForVerticalGesture(deltaX, deltaY)
    },
    [shouldCloseForVerticalGesture]
  )

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null
  }, [])

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
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
        onClose()
      }
    },
    [onClose, resetWheelAccumulator]
  )

  useEffect(() => {
    return () => {
      resetWheelAccumulator()
    }
  }, [resetWheelAccumulator])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-background/90 backdrop-blur-lg p-4"
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal content */}
      <motion.div
        className="relative z-10 w-full max-w-[1254px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onTouchStartCapture={handleTouchStart}
        onTouchMoveCapture={handleTouchMove}
        onTouchEndCapture={handleTouchEnd}
        onTouchCancelCapture={handleTouchCancel}
        onWheelCapture={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-7 sm:mb-6 px-1.5 items-center sm:items-start">
          <div className="flex flex-col gap-1.5 sm:gap-2 items-center sm:items-start text-center sm:text-left">
            <motion.span
              className="text-xs text-muted tracking-widest uppercase font-mono"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                enter: { delay: 0.15, duration: 0.25, ease: [0.23, 1, 0.32, 1] },
                exit: { duration: 0.1, ease: [0.4, 0, 1, 1] }
              }}
            >
              {video.company}
            </motion.span>
            <motion.h2
              id="modal-title"
              className="text-xl sm:text-2xl font-light text-foreground tracking-tight"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                enter: { delay: 0.18, duration: 0.25, ease: [0.23, 1, 0.32, 1] },
                exit: { duration: 0.1, ease: [0.4, 0, 1, 1] }
              }}
            >
              {video.title}
            </motion.h2>
          </div>
          {/* Visit button - desktop only (in title bar) */}
          {video.websiteUrl && (
            <motion.a
              href={video.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-8 px-3.5 text-sm rounded-full bg-transparent text-foreground border border-border hover:bg-surface items-center justify-center font-medium transition-all"
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                enter: { delay: 0.15, duration: 0.25, ease: [0.23, 1, 0.32, 1] },
                exit: { duration: 0.1, ease: [0.4, 0, 1, 1] }
              }}
            >
              Visit
            </motion.a>
          )}
        </div>

        {/* Video section with player controls */}
        <div className="rounded-lg overflow-hidden">
          <motion.div
            ref={videoContainerRef}
            layoutId={`video-${video.id}`}
            transition={SHARED_LAYOUT_SPRING}
            className="relative aspect-video bg-black rounded-lg overflow-hidden isolate"
          >
            {/* Clickable overlay to toggle play/pause - excludes bottom controls area */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 bottom-20 z-10 w-full cursor-pointer bg-transparent"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            />

            {/* Play/Pause icon feedback */}
            {showPlayIcon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
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
            <VideoPlayer
              ref={playerRef}
              src={video.videoUrl}
              startMuted={false}
              onQualityLevelsChange={setQualityLevels}
            />

            {/* Player controls */}
            {videoElement && (
              <PlayerControls
                videoRef={videoElementRef}
                duration={video.duration}
                chapters={chapters}
                containerRef={videoContainerRef}
                qualityLevels={qualityLevels}
                currentQuality={currentQuality}
                onQualityChange={handleQualityChange}
              />
            )}
          </motion.div>
        </div>

        {/* Visit button - mobile only (below video) */}
        {video.websiteUrl && (
          <motion.a
            href={video.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden mt-6 h-10 px-3.5 text-sm rounded-full bg-transparent text-foreground border border-border hover:bg-surface inline-flex items-center justify-center font-medium transition-all w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              enter: { delay: 0.2, duration: 0.25, ease: [0.23, 1, 0.32, 1] },
              exit: { duration: 0.1, ease: [0.4, 0, 1, 1] }
            }}
          >
            Visit
          </motion.a>
        )}
      </motion.div>
    </motion.div>
  )
}
