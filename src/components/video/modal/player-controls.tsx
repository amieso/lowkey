'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { formatDuration } from '@/lib/utils'
import { Chapter } from '@/types/video'
import { SegmentedSeekBar } from './segmented-seek-bar'
import { ChapterTimeline } from './chapter-timeline'
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

  // Cursor-idle tracking: after 1.5s without mouse movement over the player
  // (or after the cursor leaves it), the chapter timeline shrinks to a thin
  // bar. Any movement grows it back. Never shrink mid-drag or while the
  // cursor rests directly on the chapter timeline.
  const [cursorIdle, setCursorIdle] = useState(false)
  const idleTimerRef = useRef<number | null>(null)
  const seekAreaRef = useRef<HTMLDivElement>(null)
  const hoveringControlsRef = useRef(false)
  const isSeekingRef = useRef(false)
  isSeekingRef.current = isSeeking

  useEffect(() => {
    const el = containerRef?.current
    if (!el) return

    const arm = () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => {
        if (!hoveringControlsRef.current && !isSeekingRef.current) {
          setCursorIdle(true)
        }
      }, 1500)
    }
    const wake = () => {
      setCursorIdle(false)
      arm()
    }
    // Resting ON the timeline pins it open (mousemove alone can't — a still
    // cursor stops producing events, and the idle timer would collapse it
    // out from under the pointer).
    const seekEl = seekAreaRef.current
    const seekEnter = () => {
      hoveringControlsRef.current = true
      setCursorIdle(false)
    }
    const seekLeave = () => {
      hoveringControlsRef.current = false
      arm()
    }

    el.addEventListener('mousemove', wake)
    el.addEventListener('mouseleave', arm)
    seekEl?.addEventListener('mouseenter', seekEnter)
    seekEl?.addEventListener('mouseleave', seekLeave)
    arm()

    return () => {
      el.removeEventListener('mousemove', wake)
      el.removeEventListener('mouseleave', arm)
      seekEl?.removeEventListener('mouseenter', seekEnter)
      seekEl?.removeEventListener('mouseleave', seekLeave)
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
    }
  }, [containerRef])

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [videoRef])

  return (
    // z-40 keeps the controls above the click-to-toggle overlay (z-30 in
    // video-card), which only excludes the bottom 80px — the fullscreen
    // chapter timeline is taller than that
    <div className="absolute bottom-0 left-0 right-0 z-40">
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

      {/* Seek bar: labeled chapter timeline when chapters exist, thin segmented bar otherwise */}
      <div ref={seekAreaRef} className="relative px-4 pt-8">
        {chapters.length > 0 ? (
          <ChapterTimeline
            chapters={chapters}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onSeekStart={handleSeekStart}
            onSeekEnd={handleSeekEnd}
            compact={cursorIdle}
          />
        ) : (
          <SegmentedSeekBar
            chapters={chapters}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            onSeekStart={handleSeekStart}
            onSeekEnd={handleSeekEnd}
          />
        )}
      </div>

      {/* Controls row - 3 column layout */}
      <div className="relative flex items-center justify-between px-4 pt-2 pb-5">
        {/* Left controls */}
        <div className="flex items-center gap-1 flex-1">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon className="w-5 h-5 text-white" />
            ) : (
              <PlayIcon className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Skip backward 5s - hidden on mobile */}
          <div className="hidden sm:block">
            <SkipButton direction="backward" onSkip={handleSkip} />
          </div>

          {/* Skip forward 5s - hidden on mobile */}
          <div className="hidden sm:block">
            <SkipButton direction="forward" onSkip={handleSkip} />
          </div>

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

          {/* Speed selector - hidden on mobile */}
          <div className="hidden sm:block">
            <SpeedSelector
              currentSpeed={playbackSpeed}
              onSpeedChange={handleSpeedChange}
            />
          </div>

          {/* Fullscreen */}
          <FullscreenButton containerRef={containerRef} videoRef={videoRef} />
        </div>
      </div>
    </div>
  )
}
