import { useEffect, useRef } from 'react'
import { Video } from '@/types/video'
import { reportWatchTime, MIN_REPORTABLE_SECONDS } from '@/lib/watch-time'
import { trackGoal, GOALS } from '@/lib/analytics'

// timeupdate fires ~4×/sec, so a delta this large isn't continuous watching —
// it's a seek, a loop wrap (the grid player rewinds to 0 on end), or the gap
// after the tab was backgrounded. We count only forward, real-pace progress,
// which naturally excludes paused and buffering time (no ticks fire then).
const MAX_TICK_DELTA = 1.5

// Coarse buckets for the DataFast dashboard goal (string metadata only). The
// rankable source of truth is the Redis counter; this is just for eyeballing.
function bucketSeconds(seconds: number): string {
  if (seconds < 5) return '<5'
  if (seconds < 15) return '5-15'
  if (seconds < 30) return '15-30'
  if (seconds < 60) return '30-60'
  if (seconds < 180) return '60-180'
  return '180+'
}

/**
 * Accumulate how many seconds a video is actually watched while expanded, and
 * report increments to /api/watch. Reports the *delta* since the last flush on
 * each of: tab hidden, page hide, and card collapse/unmount — so a watch that
 * ends by closing the tab still counts, and a long watch isn't lost to a single
 * teardown event. Scoped to the expanded player; grid-preview autoplay never
 * counts.
 */
export function useWatchTime(video: Video, videoEl: HTMLVideoElement | null, isExpanded: boolean) {
  // Engaged content-seconds this expand session, and how much we've already
  // reported, so each flush sends only what's new.
  const watchedRef = useRef(0)
  const reportedRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isExpanded || !videoEl) return

    const flush = () => {
      const pending = Math.floor(watchedRef.current) - reportedRef.current
      if (pending < MIN_REPORTABLE_SECONDS) return
      reportedRef.current += pending
      reportWatchTime(video.id, pending)
    }

    const handleTimeUpdate = () => {
      const { currentTime } = videoEl
      const last = lastTimeRef.current
      lastTimeRef.current = currentTime
      if (last === null) return
      const delta = currentTime - last
      // Forward, real-pace progress only: a negative delta is a loop reset or
      // rewind; an oversized one is a seek. Both are discarded.
      if (delta > 0 && delta < MAX_TICK_DELTA) watchedRef.current += delta
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    videoEl.addEventListener('timeupdate', handleTimeUpdate)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', flush)

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', flush)
      // Card is collapsing or unmounting — send the tail of this session to the
      // counter, then ping DataFast once with the session total for the
      // dashboard, then reset so the next open is a fresh count.
      flush()
      const total = Math.floor(watchedRef.current)
      if (total >= MIN_REPORTABLE_SECONDS) {
        trackGoal(GOALS.videoWatchTime, {
          video_id: video.id,
          company: video.companySlug,
          slug: video.slug,
          bucket: bucketSeconds(total),
        })
      }
      watchedRef.current = 0
      reportedRef.current = 0
      lastTimeRef.current = null
    }
  }, [isExpanded, videoEl, video.id, video.companySlug, video.slug])
}
