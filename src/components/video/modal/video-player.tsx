'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

export interface QualityLevel {
  height: number
  index: number
}

export interface VideoPlayerHandle {
  play: () => void
  pause: () => void
  setMuted: (muted: boolean) => void
  getVideoElement: () => HTMLVideoElement | null
  getQualityLevels: () => QualityLevel[]
  getCurrentQuality: () => number
  setQuality: (index: number) => void
}

interface VideoPlayerProps {
  src: string
  className?: string
  onQualityLevelsChange?: (levels: QualityLevel[]) => void
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, className = '', onQualityLevelsChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
    const [currentQuality, setCurrentQuality] = useState(-1) // -1 = auto

    const getQualityLevels = useCallback(() => qualityLevels, [qualityLevels])
    const getCurrentQuality = useCallback(() => currentQuality, [currentQuality])

    const setQuality = useCallback((index: number) => {
      const hls = hlsRef.current
      if (hls) {
        hls.currentLevel = index
        setCurrentQuality(index)
      }
    }, [])

    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play().catch(() => {}),
      pause: () => videoRef.current?.pause(),
      setMuted: (muted: boolean) => {
        if (videoRef.current) {
          videoRef.current.muted = muted
        }
      },
      getVideoElement: () => videoRef.current,
      getQualityLevels,
      getCurrentQuality,
      setQuality,
    }), [getQualityLevels, getCurrentQuality, setQuality])

    useEffect(() => {
      const videoEl = videoRef.current
      if (!videoEl || !src) return

      if (Hls.isSupported()) {
        const hls = new Hls()
        hlsRef.current = hls
        hls.loadSource(src)
        hls.attachMedia(videoEl)

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const levels: QualityLevel[] = data.levels.map((level, index) => ({
            height: level.height,
            index,
          }))
          setQualityLevels(levels)
          onQualityLevelsChange?.(levels)
          videoEl.play().catch(() => {})
        })

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (hls.autoLevelEnabled) {
            setCurrentQuality(-1)
          } else {
            setCurrentQuality(data.level)
          }
        })

        return () => {
          hls.destroy()
          hlsRef.current = null
          setQualityLevels([])
        }
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support - no quality control available
        videoEl.src = src
        videoEl.play().catch(() => {})
      }
    }, [src, onQualityLevelsChange])

    return (
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        className={`h-full w-full object-cover rounded-lg ${className}`}
      />
    )
  }
)
