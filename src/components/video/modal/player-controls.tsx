'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { Chapter } from '@/types/video'
import { SegmentedSeekBar } from './segmented-seek-bar'
import { SpeedSelector } from './speed-selector'
import { ResolutionSelector } from './resolution-selector'
import { FullscreenButton } from './fullscreen-button'
import { SkipButton } from './skip-button'
import { VolumeSlider } from './volume-slider'
import { QualityLevel } from './video-player'

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  duration: number
  chapters?: Chapter[]
  containerRef?: React.RefObject<HTMLElement | null>
  qualityLevels?: QualityLevel[]
  currentQuality?: number
  onQualityChange?: (index: number) => void
}

export function PlayerControls({
  videoRef,
  duration,
  chapters = [],
  containerRef,
  qualityLevels = [],
  currentQuality = -1,
  onQualityChange,
}: PlayerControlsProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [videoRef, isSeeking])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }, [videoRef, isPlaying])

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = time
    setCurrentTime(time)
  }, [videoRef])

  const handleSkip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return

    const newTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
    video.currentTime = newTime
    setCurrentTime(newTime)
  }, [videoRef, duration])

  const handleSeekStart = useCallback(() => setIsSeeking(true), [])
  const handleSeekEnd = useCallback(() => setIsSeeking(false), [])

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [videoRef])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Progressive blur layers */}
      <div
        className="absolute inset-0 backdrop-blur-[2px] pointer-events-none"
        style={{ maskImage: 'linear-gradient(to top, black 0%, transparent 60%)' }}
      />
      <div
        className="absolute inset-0 backdrop-blur-[8px] pointer-events-none"
        style={{ maskImage: 'linear-gradient(to top, black 0%, transparent 30%)' }}
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Segmented seek bar */}
      <div className="relative px-4 pt-8">
        <SegmentedSeekBar
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          onSeekStart={handleSeekStart}
          onSeekEnd={handleSeekEnd}
        />
      </div>

      {/* Controls row - 3 column layout */}
      <div className="relative flex items-center justify-between px-4 pt-2 pb-5">
        {/* Left controls */}
        <div className="flex items-center gap-1 flex-1">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-1.5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </button>

          {/* Skip backward 5s */}
          <SkipButton direction="backward" onSkip={handleSkip} />

          {/* Skip forward 5s */}
          <SkipButton direction="forward" onSkip={handleSkip} />

          {/* Volume with slider */}
          <VolumeSlider videoRef={videoRef} />
        </div>

        {/* Center - Time display */}
        <div className="flex-shrink-0">
          <span className="text-xs text-white font-mono tabular-nums">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(duration)}
          </span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {/* Resolution selector */}
          {qualityLevels.length > 0 && onQualityChange && (
            <ResolutionSelector
              levels={qualityLevels}
              currentLevel={currentQuality}
              onLevelChange={onQualityChange}
            />
          )}

          {/* Speed selector */}
          <SpeedSelector
            currentSpeed={playbackSpeed}
            onSpeedChange={handleSpeedChange}
          />

          {/* Fullscreen */}
          {containerRef && (
            <FullscreenButton containerRef={containerRef} />
          )}
        </div>
      </div>
    </div>
  )
}
