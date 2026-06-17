'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Video } from '@/types/video'
import { videoPath } from '@/data/videos'
import { trackGoal, trackGoalWhenReady } from '@/lib/analytics'

interface UseExpandedVideoOptions {
  /** Video open on first render (deep-link landing on /[company]/[slug]). */
  initialId?: string | null
  /**
   * URL to restore when the modal closes — the page's own address with no
   * video. `/` on the home page, `/[company]` on a company page. Defaults to
   * the current path so a plain grid still round-trips correctly.
   */
  basePath?: string
}

// Tracks which video is expanded, keeps the URL in sync so an open video is a
// copyable permalink, and wires up left/right arrow navigation between the
// playable videos while one is open.
export function useExpandedVideo(
  videos: Video[],
  options: UseExpandedVideoOptions | string | null = {},
) {
  // Back-compat: the hook used to take `initialId` as a bare second argument.
  const opts: UseExpandedVideoOptions =
    typeof options === 'string' || options === null ? { initialId: options } : options
  const { initialId = null, basePath } = opts

  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(initialId)
  // True while switching videos via arrows: the swap is instant (no morph),
  // whereas opening from the grid and closing back to it stay animated.
  const [instant, setInstant] = useState(false)

  // Did *this* component push a history entry for the open modal? If so, close
  // pops it (restoring the prior URL + scroll). If the modal was open on first
  // render (a deep link), there's no in-app entry to pop, so we replace instead.
  const pushedEntryRef = useRef(false)
  // Guard so URL changes we make ourselves don't echo back through popstate.
  const syncingFromPopRef = useRef(false)

  const resolveBasePath = useCallback(() => {
    if (basePath) return basePath
    if (typeof window === 'undefined') return '/'
    return window.location.pathname
  }, [basePath])

  // Push/replace the URL without involving the Next.js router: App Router's
  // router.push would re-run server components and tear down the player. The
  // History API swaps the address bar only, leaving the modal mounted. We thread
  // the existing window.history.state through so Next's own router state (which
  // it stores there) survives our navigations.
  const writeUrl = useCallback((url: string, mode: 'push' | 'replace') => {
    if (typeof window === 'undefined') return
    const state = window.history.state
    if (mode === 'push') window.history.pushState(state, '', url)
    else window.history.replaceState(state, '', url)
  }, [])

  const open = useCallback(
    (video: Video) => {
      setInstant(false)
      setExpandedVideoId(video.id)
      trackGoal('video_open', {
        video_id: video.id,
        company: video.companySlug,
        slug: video.slug,
        source: 'grid',
      })
      if (syncingFromPopRef.current) return
      writeUrl(videoPath(video), 'push')
      pushedEntryRef.current = true
    },
    [writeUrl],
  )

  // Track deep-link landings (a video open on first render, reached via a
  // direct/shared /[company]/[slug] URL) the same way as in-app opens, tagged
  // with source: 'direct_link' so the two entry paths stay homogeneous but
  // remain distinguishable in the dashboard. Fires once per mount.
  const trackedInitialRef = useRef(false)
  useEffect(() => {
    if (trackedInitialRef.current) return
    if (!initialId) return
    const video = videos.find((v) => v.id === initialId)
    if (!video) return
    trackedInitialRef.current = true
    trackGoalWhenReady('video_open', {
      video_id: video.id,
      company: video.companySlug,
      slug: video.slug,
      source: 'direct_link',
    })
  }, [initialId, videos])

  const close = useCallback(() => {
    setInstant(false)
    setExpandedVideoId(null)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    if (syncingFromPopRef.current) return
    if (pushedEntryRef.current) {
      // Pop our own entry so Back/Forward history stays clean and the previous
      // URL + scroll position are restored by the browser.
      pushedEntryRef.current = false
      window.history.back()
    } else {
      // Deep-link landing: no entry of ours to pop, so rewrite in place.
      writeUrl(resolveBasePath(), 'replace')
    }
  }, [resolveBasePath, writeUrl])

  // Arrow navigation between videos. Replace (not push) so a long browsing
  // streak doesn't bury the entry the grid pushed — Back should still return to
  // the grid in one step, not walk back through every video viewed.
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
      writeUrl(videoPath(next), 'replace')
    }

    window.addEventListener('keydown', handleArrows)
    return () => window.removeEventListener('keydown', handleArrows)
  }, [expandedVideoId, videos, writeUrl])

  // Reconcile modal state to the URL on Back/Forward. The address bar is the
  // source of truth here: derive which video (if any) the new URL names and
  // match the modal to it, without writing the URL back out.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const match = path.match(/^\/([^/]+)\/([^/]+)\/?$/)
      const target = match
        ? videos.find((v) => v.companySlug === match[1] && v.slug === match[2] && v.videoUrl)
        : undefined

      syncingFromPopRef.current = true
      if (target) {
        setInstant(false)
        setExpandedVideoId(target.id)
      } else {
        setExpandedVideoId(null)
      }
      // Any modal now reflects the URL, not an entry we owe a pop to.
      pushedEntryRef.current = false
      // Release the guard after the state updates have been queued.
      requestAnimationFrame(() => {
        syncingFromPopRef.current = false
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [videos])

  // Re-enable animation once the instant swap has committed, so the eventual
  // close still morphs back into the grid.
  useEffect(() => {
    if (!instant) return
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [instant])

  return { expandedVideoId, instant, open, close }
}
