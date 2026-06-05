'use client'

import { useCallback, useEffect, useState } from 'react'
import { Video } from '@/types/video'

// Tracks which video is expanded and wires up left/right arrow navigation
// between the playable videos while one is open.
export function useExpandedVideo(videos: Video[], initialId: string | null = null) {
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(initialId)
  // True while switching videos via arrows: the swap is instant (no morph),
  // whereas opening from the grid and closing back to it stay animated.
  const [instant, setInstant] = useState(false)

  const open = useCallback((video: Video) => {
    setInstant(false)
    setExpandedVideoId(video.id)
  }, [])

  const close = useCallback(() => {
    setInstant(false)
    setExpandedVideoId(null)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  useEffect(() => {
    if (!expandedVideoId) return
    const playable = videos.filter((video) => video.videoUrl)

    const handleArrows = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const index = playable.findIndex((video) => video.id === expandedVideoId)
      if (index === -1) return
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const next = playable[(index + delta + playable.length) % playable.length]
      setInstant(true)
      setExpandedVideoId(next.id)
    }

    window.addEventListener('keydown', handleArrows)
    return () => window.removeEventListener('keydown', handleArrows)
  }, [expandedVideoId, videos])

  // Re-enable animation once the instant swap has committed, so the eventual
  // close still morphs back into the grid.
  useEffect(() => {
    if (!instant) return
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [instant])

  return { expandedVideoId, instant, open, close }
}
