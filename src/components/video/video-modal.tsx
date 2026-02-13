'use client'

import { useEffect, useCallback, useRef, useState, type TouchEvent } from 'react'
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

export function VideoModal({ video, onClose }: VideoModalProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
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
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
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

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return
    const touch = event.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current
      touchStartRef.current = null
      if (!start || event.changedTouches.length !== 1) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      if (Math.abs(deltaY) >= SWIPE_CLOSE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
        onClose()
      }
    },
    [onClose]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/90 backdrop-blur-lg p-4"
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal content */}
      <motion.div
        className="relative z-10 w-full max-w-[1254px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
