'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks a video's playback clock smoothly.
 *
 * The `timeupdate` event only has to fire every ~250ms, so anything driven off
 * it — progress fills, chapter bars — visibly steps rather than glides. This
 * samples `currentTime` on requestAnimationFrame while the video is playing, so
 * consumers repaint at the display's refresh rate, and falls back to the events
 * when it's paused, seeked, or first mounted.
 *
 * Returns the setter too, so callers can push a value in for immediate feedback
 * when the user scrubs or skips, ahead of the element's own clock catching up.
 * Pass `freeze` while a scrub is in progress so the loop doesn't fight the
 * user's drag position.
 */
export function useVideoTime(
  videoRef: RefObject<HTMLVideoElement | null>,
  freeze = false,
): [number, (time: number) => void] {
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let frame = 0

    const sync = () => setCurrentTime(video.currentTime)

    const tick = () => {
      sync()
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }

    // While scrubbing the caller owns the displayed time; just listen for the
    // resting events so we land on the right value once the drag ends.
    if (!freeze) {
      sync()
      if (!video.paused && !video.ended) start()
      video.addEventListener('play', start)
      video.addEventListener('playing', start)
      video.addEventListener('timeupdate', sync)
      video.addEventListener('seeked', sync)
    }
    video.addEventListener('pause', stop)
    video.addEventListener('ended', stop)

    return () => {
      stop()
      video.removeEventListener('play', start)
      video.removeEventListener('playing', start)
      video.removeEventListener('timeupdate', sync)
      video.removeEventListener('seeked', sync)
      video.removeEventListener('pause', stop)
      video.removeEventListener('ended', stop)
    }
  }, [videoRef, freeze])

  return [currentTime, setCurrentTime]
}
