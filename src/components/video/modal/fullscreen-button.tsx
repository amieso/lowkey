'use client'

import { useState, useEffect } from 'react'
import { ExpandIcon, MinimizeIcon } from '@/components/ui/player-icons'

interface FullscreenButtonProps {
  containerRef?: React.RefObject<HTMLElement | null>
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export function FullscreenButton({ containerRef, videoRef }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sync state with fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    const video = videoRef.current
    const container = containerRef?.current

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen - try video element first for iOS Safari
        const videoWithWebkit = video as HTMLVideoElement & {
          webkitEnterFullscreen?: () => void
          webkitSupportsFullscreen?: boolean
        }

        if (videoWithWebkit?.webkitSupportsFullscreen && videoWithWebkit.webkitEnterFullscreen) {
          // iOS Safari - use native video fullscreen
          videoWithWebkit.webkitEnterFullscreen()
        } else if (container?.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })?.webkitRequestFullscreen) {
          // Safari desktop
          await (container as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  return (
    <button
      onClick={toggleFullscreen}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <MinimizeIcon className="w-4 h-4 text-white" />
      ) : (
        <ExpandIcon className="w-4 h-4 text-white" />
      )}
    </button>
  )
}
