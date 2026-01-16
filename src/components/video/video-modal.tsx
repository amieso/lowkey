'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, X } from 'lucide-react'
import { Video } from '@/types/video'
import { VideoPlayer, VideoPlayerHandle, QualityLevel } from './modal/video-player'
import { PlayerControls } from './modal/player-controls'
import { getChaptersForVideo } from '@/data/chapters'

interface VideoModalProps {
  video: Video
  allVideos: Video[]
  onClose: () => void
  onVideoChange: (video: Video) => void
}

export function VideoModal({ video, onClose }: VideoModalProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 backdrop-blur-lg p-4"
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 w-full max-w-[1600px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video section with player controls */}
        <div className="rounded-lg overflow-hidden">
          <div ref={videoContainerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden isolate">
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
                <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center">
                  {lastAction === 'play' ? (
                    <Play className="w-10 h-10 text-white fill-white ml-1" />
                  ) : (
                    <Pause className="w-10 h-10 text-white fill-white" />
                  )}
                </div>
              </motion.div>
            )}
            <VideoPlayer
              ref={playerRef}
              src={video.videoUrl}
              onQualityLevelsChange={setQualityLevels}
            />

            {/* Player controls */}
            {videoElement && (
              <PlayerControls
                videoRef={{ current: videoElement }}
                duration={video.duration}
                chapters={chapters}
                containerRef={videoContainerRef}
                qualityLevels={qualityLevels}
                currentQuality={currentQuality}
                onQualityChange={handleQualityChange}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
