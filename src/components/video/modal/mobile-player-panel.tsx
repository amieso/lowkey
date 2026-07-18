'use client'

import { useCallback, useEffect, useState } from 'react'
import { Video, Chapter } from '@/types/video'
import { formatDuration, platformName } from '@/lib/utils'
import { PlayIcon, PauseIcon } from '@/components/ui/player-icons'
import { VideoMetrics } from '@/components/video/video-metrics'
import { trackGoal, GOALS, type GoalName } from '@/lib/analytics'
import { MobileScrubBar } from './mobile-scrub-bar'
import { ChapterList } from './chapter-list'
import { useVideoTime } from '@/hooks/use-video-time'
import { SpeedSelector } from './speed-selector'
import { ResolutionSelector } from './resolution-selector'
import { FullscreenButton } from './fullscreen-button'
import { VolumeSlider } from './volume-slider'
import { QualityLevel } from './video-player'

interface MobilePlayerPanelProps {
  video: Video
  videoRef: React.RefObject<HTMLVideoElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  chapters: Chapter[]
  qualityLevels: QualityLevel[]
  currentQuality: number
  onQualityChange: (index: number) => void
  onClose?: () => void
  /** Absolute top edge — sits just under the pinned video box. */
  top: string
}

/**
 * The whole expanded-player chrome, stacked below the video on phones.
 *
 * On a 390px viewport a 16:9 video is only ~200px tall, so overlaying controls
 * and floating a title row above the frame left every element fighting for the
 * same few hundred pixels — the title truncated to a single character. All that
 * vertical letterboxing below the video was dead space, so the chrome moves
 * there and each group gets its own line.
 */
export function MobilePlayerPanel({
  video,
  videoRef,
  containerRef,
  chapters,
  qualityLevels,
  currentQuality,
  onQualityChange,
  onClose,
  top,
}: MobilePlayerPanelProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isSeeking, setIsSeeking] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentTime, setCurrentTime] = useVideoTime(videoRef, isSeeking)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    setIsPlaying(!el.paused)
    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
    return () => {
      el.removeEventListener('play', handlePlay)
      el.removeEventListener('pause', handlePause)
    }
  }, [videoRef])

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }, [videoRef])

  const handleSeek = useCallback((time: number) => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = time
    setCurrentTime(time)
  }, [videoRef])

  const handleSpeedChange = useCallback((speed: number) => {
    const el = videoRef.current
    if (!el) return
    el.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [videoRef])

  const trackOutbound = (goal: GoalName) => trackGoal(goal, {
    video_id: video.id,
    company: video.companySlug,
    slug: video.slug,
  })

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[130] flex flex-col pointer-events-auto"
      style={{ top }}
      // The card's swipe-to-close listens on the video box; stop taps in here
      // from bubbling up to the article's select handler.
      onClick={(event) => event.stopPropagation()}
    >
      {/* Everything above the outbound links scrolls; the links stay pinned. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pt-3 pb-3">
        {/* Title + close */}
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-base font-light leading-snug tracking-tight text-white">
            {video.title}
          </h2>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onClose?.()
            }}
            className="-mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white active:bg-white/20"
            aria-label="Close video"
          >
            ×
          </button>
        </div>

        {/* Company + engagement */}
        <div className="-mt-1.5 flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">
            {video.company}
          </span>
          <VideoMetrics sourceUrl={video.sourceUrl} variant="inline" className="!text-white/45" />
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-white/10"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5 text-white" />
            ) : (
              <PlayIcon className="h-5 w-5 text-white" />
            )}
          </button>
          <VolumeSlider videoRef={videoRef} />

          <span className="flex-1 text-center font-mono text-xs tabular-nums text-white/80">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(video.duration)}
          </span>

          <SpeedSelector currentSpeed={playbackSpeed} onSpeedChange={handleSpeedChange} />
          {qualityLevels.length > 0 && (
            <ResolutionSelector
              levels={qualityLevels}
              currentLevel={currentQuality}
              onLevelChange={onQualityChange}
            />
          )}
          <FullscreenButton containerRef={containerRef} videoRef={videoRef} />
        </div>

        <MobileScrubBar
          chapters={chapters}
          currentTime={currentTime}
          duration={video.duration}
          onSeek={handleSeek}
          onSeekStart={() => setIsSeeking(true)}
          onSeekEnd={() => setIsSeeking(false)}
        />

        {chapters.length > 0 && (
          <>
            <div className="h-px bg-white/10" />
            <ChapterList
              chapters={chapters}
              currentTime={currentTime}
              duration={video.duration}
              onSeek={handleSeek}
            />
          </>
        )}
      </div>

      {/* Outbound links — pinned to the bottom of the viewport so the primary
          actions stay reachable however long the chapter list runs. */}
      {(video.sourceUrl || video.websiteUrl) && (
        <div
          className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/60 px-3 pt-3 backdrop-blur-md"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {video.sourceUrl && (
            <a
              href={video.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                event.stopPropagation()
                trackOutbound(GOALS.outboundPost)
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white active:bg-white/20"
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
                trackOutbound(GOALS.outboundVisit)
              }}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white active:bg-white/20"
            >
              Visit
            </a>
          )}
        </div>
      )}
    </div>
  )
}
