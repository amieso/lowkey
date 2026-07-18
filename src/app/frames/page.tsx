'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { videos } from '@/data/videos'
import { Video } from '@/types/video'

/**
 * /frames — an iOS Photos clone for rapidly iterating through frames of the
 * launch videos.
 *
 * - The filmstrip switches between videos.
 * - The playback scrubber scrubs *time* within the current video; each position
 *   re-fetches the Mux thumbnail at that timestamp, so you're effectively
 *   flipping through every frame of every launch video.
 * - Heart a frame to shortlist it (persisted); Share/Info copy the exact Mux
 *   frame URL so you can drop it straight into the supercut.
 *
 * Keyboard: ←/→ switch video · ↑/↓ or ,/. step 1s · ⇧+←/→ jump 5s ·
 *           space play/pause · f favorite · i info
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif'

const FAVS_KEY = 'lowkey-frame-favorites'

type Fav = { company: string; slug: string; title: string; t: number; url: string }

function muxId(video: Video): string | null {
  const m = video.thumbnailUrl?.match(/image\.mux\.com\/([^/]+)\//)
  return m ? m[1] : null
}

function frameUrl(video: Video, t: number, width = 1280): string {
  const id = muxId(video)
  if (!id) return video.thumbnailUrl ?? ''
  return `https://image.mux.com/${id}/thumbnail.webp?time=${Math.max(0, Math.round(t))}&width=${width}`
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${d}. ${MONTHS[m - 1]} ${y}`
}

// Only videos that resolve to a Mux asset can be scrubbed.
const ITEMS: Video[] = videos.filter((v) => muxId(v))

export default function FramesPage() {
  const [index, setIndex] = useState(0)
  const [times, setTimes] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showInfo, setShowInfo] = useState(false)
  const [favs, setFavs] = useState<Fav[]>([])
  const [showFavs, setShowFavs] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const list = useMemo(() => ITEMS.filter((v) => !removed.has(v.id)), [removed])
  const video = list[Math.min(index, list.length - 1)] ?? list[0]
  const key = video ? `${video.companySlug}/${video.slug}` : ''
  const duration = video?.duration ?? 60
  const defaultT = useMemo(() => Math.min(5, Math.round(duration * 0.3)), [duration])
  const t = times[key] ?? defaultT

  const filmstripRef = useRef<HTMLDivElement>(null)

  // Load favorites once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVS_KEY)
      if (raw) setFavs(JSON.parse(raw))
    } catch {}
  }, [])

  const persistFavs = useCallback((next: Fav[]) => {
    setFavs(next)
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 1400)
  }, [])

  const setT = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(duration, next))
      setTimes((prev) => ({ ...prev, [key]: clamped }))
    },
    [duration, key],
  )

  const go = useCallback(
    (dir: number) => {
      setIndex((i) => (i + dir + list.length) % list.length)
      setPlaying(false)
    },
    [list.length],
  )

  const isFav = favs.some((f) => f.company === video?.companySlug && f.slug === video?.slug && f.t === t)

  const toggleFav = useCallback(() => {
    if (!video) return
    const exists = favs.find((f) => f.company === video.companySlug && f.slug === video.slug && f.t === t)
    if (exists) {
      persistFavs(favs.filter((f) => f !== exists))
      flash('Removed from favorites')
    } else {
      persistFavs([
        ...favs,
        { company: video.companySlug, slug: video.slug, title: video.title, t, url: frameUrl(video, t, 1920) },
      ])
      flash('♥ Favorited')
    }
  }, [video, favs, t, persistFavs, flash])

  const copyUrl = useCallback(() => {
    if (!video) return
    navigator.clipboard?.writeText(frameUrl(video, t, 1920))
    flash('Frame URL copied')
  }, [video, t, flash])

  const trash = useCallback(() => {
    if (!video) return
    setRemoved((prev) => new Set(prev).add(video.id))
    flash('Removed from set')
  }, [video, flash])

  // Auto-advance (rough playback) — steps the frame time while "playing".
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setTimes((prev) => {
        const cur = prev[key] ?? defaultT
        const next = cur + 1 >= duration ? 0 : cur + 1
        return { ...prev, [key]: next }
      })
    }, 350)
    return () => window.clearInterval(id)
  }, [playing, key, duration, defaultT])

  // Keep the active filmstrip thumbnail centered.
  useEffect(() => {
    const el = filmstripRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [index, list.length])

  // Preload neighbor frames for instant switching.
  useEffect(() => {
    if (!list.length) return
    ;[-1, 1].forEach((d) => {
      const n = list[(index + d + list.length) % list.length]
      if (n) {
        const img = new Image()
        img.src = frameUrl(n, times[`${n.companySlug}/${n.slug}`] ?? Math.min(5, Math.round((n.duration ?? 60) * 0.3)))
      }
    })
  }, [index, list, times])

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        e.shiftKey ? setT(t - 5) : go(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        e.shiftKey ? setT(t + 5) : go(1)
      } else if (e.key === 'ArrowUp' || e.key === '.') {
        e.preventDefault()
        setT(t + 1)
      } else if (e.key === 'ArrowDown' || e.key === ',') {
        e.preventDefault()
        setT(t - 1)
      } else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'f') {
        toggleFav()
      } else if (e.key === 'i') {
        setShowInfo((s) => !s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [t, go, setT, toggleFav])

  if (!video) return null

  const progress = duration > 0 ? t / duration : 0

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-neutral-200">
    <div
      className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden bg-white text-black select-none shadow-2xl sm:h-[94vh] sm:max-h-[940px] sm:rounded-[44px] sm:ring-[6px] sm:ring-black"
      style={{ fontFamily: SANS }}
    >
      <StatusBar />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-1 pb-2">
        <CircleButton onClick={() => go(-1)} aria-label="Back">
          <Chevron />
        </CircleButton>

        <div className="flex flex-col items-center rounded-full bg-white px-6 py-1.5 shadow-[0_1px_8px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]">
          <span className="text-[15px] font-semibold leading-tight">{formatDate(video.publishedDate)}</span>
          <span className="flex items-center gap-1 text-[12px] leading-tight text-neutral-500">
            {video.company}
            <PersonIcon />
          </span>
        </div>

        <CircleButton onClick={() => setShowInfo((s) => !s)} aria-label="More">
          <Ellipsis />
        </CircleButton>
      </div>

      {favs.length > 0 && (
        <button
          onClick={() => setShowFavs(true)}
          className="absolute right-4 top-[88px] z-10 flex items-center gap-1.5 rounded-full bg-black/[0.06] px-3 py-1.5 text-[13px] font-medium text-black/70 backdrop-blur"
        >
          <Heart filled className="h-3.5 w-3.5 text-rose-500" />
          {favs.length}
        </button>
      )}

      {/* Media */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3">
        <img
          key={key}
          src={frameUrl(video, t)}
          alt={video.title}
          draggable={false}
          className="max-h-full max-w-full rounded-[6px] object-contain shadow-[0_10px_40px_rgba(0,0,0,0.18)] animate-[fadein_140ms_ease-out]"
        />
        {/* invisible tap zones for prev/next */}
        <button className="absolute inset-y-0 left-0 w-1/4" onClick={() => go(-1)} aria-label="Previous" />
        <button className="absolute inset-y-0 right-0 w-1/4" onClick={() => go(1)} aria-label="Next" />

        {showInfo && <InfoPanel video={video} t={t} onClose={() => setShowInfo(false)} onCopy={copyUrl} />}
      </div>

      {/* Scrubber (scrubs time within the current video) */}
      <div className="px-4 pb-3 pt-2">
        <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-[0_1px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04]">
          <button onClick={() => setPlaying((p) => !p)} aria-label="Play/Pause" className="shrink-0">
            {playing ? <Pause /> : <Play />}
          </button>
          <span className="w-9 shrink-0 text-center text-[11px] tabular-nums text-neutral-500">
            {formatClock(t)}
          </span>
          <Scrubber progress={progress} onScrub={(p) => setT(p * duration)} />
          <span className="w-9 shrink-0 text-center text-[11px] tabular-nums text-neutral-400">
            {formatClock(duration)}
          </span>
          <button onClick={() => setMuted((m) => !m)} aria-label="Mute" className="shrink-0">
            {muted ? <MuteOff /> : <MuteOn />}
          </button>
        </div>
      </div>

      {/* Filmstrip (switches videos) */}
      <div
        ref={filmstripRef}
        className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((v, i) => {
          const active = i === index
          const vt = times[`${v.companySlug}/${v.slug}`] ?? Math.min(5, Math.round((v.duration ?? 60) * 0.3))
          return (
            <button
              key={v.id}
              data-active={active}
              onClick={() => {
                setIndex(i)
                setPlaying(false)
              }}
              className={[
                'relative shrink-0 overflow-hidden transition-all duration-200',
                active
                  ? 'h-14 w-[84px] rounded-md ring-[2.5px] ring-black/80'
                  : 'h-11 w-11 rounded-[5px] opacity-80',
              ].join(' ')}
            >
              <img
                src={frameUrl(v, vt, 240)}
                alt={v.company}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </button>
          )
        })}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-7 pb-7 pt-3">
        <CircleButton onClick={copyUrl} aria-label="Share">
          <Share />
        </CircleButton>
        <div className="flex items-center gap-9">
          <button onClick={toggleFav} aria-label="Favorite">
            <Heart filled={isFav} className={isFav ? 'text-rose-500' : 'text-black'} />
          </button>
          <button onClick={() => setShowInfo((s) => !s)} aria-label="Info">
            <Info />
          </button>
          <button aria-label="Adjust">
            <Sliders />
          </button>
        </div>
        <CircleButton onClick={trash} aria-label="Delete">
          <Trash />
        </CircleButton>
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center">
          <div className="rounded-full bg-black/80 px-4 py-2 text-[13px] font-medium text-white backdrop-blur">
            {toast}
          </div>
        </div>
      )}

      {showFavs && (
        <FavoritesOverlay favs={favs} onClose={() => setShowFavs(false)} onClear={() => persistFavs([])} onCopy={(u) => { navigator.clipboard?.writeText(u); flash('Copied') }} />
      )}

      <style>{`@keyframes fadein{from{opacity:0}to{opacity:1}}`}</style>
    </div>
    </div>
  )
}

function Scrubber({ progress, onScrub }: { progress: number; onScrub: (p: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const handle = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    onScrub(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }, [onScrub])

  useEffect(() => {
    const move = (e: PointerEvent) => dragging.current && handle(e.clientX)
    const up = () => (dragging.current = false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [handle])

  return (
    <div
      ref={ref}
      className="relative h-6 flex-1 cursor-pointer"
      onPointerDown={(e) => {
        dragging.current = true
        handle(e.clientX)
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/10" />
      <div
        className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/30"
        style={{ width: `${progress * 100}%` }}
      />
      <div
        className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70"
        style={{ left: `${progress * 100}%` }}
      />
    </div>
  )
}

function InfoPanel({ video, t, onClose, onCopy }: { video: Video; t: number; onClose: () => void; onCopy: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-4 text-left shadow-[0_8px_40px_rgba(0,0,0,0.2)] ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold">{video.title}</div>
          <div className="text-[13px] text-neutral-500">{video.company}</div>
        </div>
        <button onClick={onClose} className="text-[13px] font-medium text-blue-500">Done</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <Stat label="Frame time" value={`${formatClock(t)} / ${formatClock(video.duration ?? 0)}`} />
        <Stat label="Aspect" value={video.aspectRatio ?? '—'} />
      </div>
      <button
        onClick={onCopy}
        className="mt-3 w-full rounded-xl bg-black/[0.06] py-2.5 text-[13px] font-medium text-black/80 active:bg-black/10"
      >
        Copy frame URL (1920w @ {formatClock(t)})
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.04] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  )
}

function FavoritesOverlay({ favs, onClose, onClear, onCopy }: { favs: Fav[]; onClose: () => void; onClear: () => void; onCopy: (u: string) => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-white sm:rounded-[44px]" style={{ fontFamily: SANS }}>
      <StatusBar />
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={onClear} className="text-[15px] text-rose-500">Clear</button>
        <div className="text-[17px] font-semibold">Favorites · {favs.length}</div>
        <button onClick={onClose} className="text-[15px] font-medium text-blue-500">Done</button>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
        {favs.map((f, i) => (
          <button key={i} onClick={() => onCopy(f.url)} className="relative overflow-hidden rounded-xl bg-black/5 ring-1 ring-black/5">
            <img src={f.url.replace('width=1920', 'width=480')} alt={f.title} className="aspect-video w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[11px] font-medium text-white">
              {f.title} · {formatClock(f.t)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3 text-[15px] font-semibold">
      <span className="tabular-nums">9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="4.5" width="3" height="7.5" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1" opacity="0.35"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.5c2.3 0 4.4.9 6 2.4l-1.3 1.4A6.6 6.6 0 0 0 8.5 4.4c-1.8 0-3.5.7-4.7 1.9L2.5 4.9A8.6 8.6 0 0 1 8.5 2.5Zm0 3.6c1.3 0 2.5.5 3.4 1.4l-1.4 1.4a2.8 2.8 0 0 0-4 0L5.1 7.5a4.8 4.8 0 0 1 3.4-1.4Zm0 3.4 1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4Z"/></svg>
        <div className="flex items-center gap-0.5">
          <div className="flex h-3 w-6 items-center rounded-[3px] p-[1.5px] ring-1 ring-black/40"><div className="h-full w-[80%] rounded-[1px] bg-black"/></div>
        </div>
      </div>
    </div>
  )
}

/* ---- chrome buttons + icons (iOS-ish) ---- */

function CircleButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-black/[0.05] text-black active:bg-black/10"
    >
      {children}
    </button>
  )
}

const ico = 'currentColor'
const Chevron = () => <svg width="13" height="22" viewBox="0 0 13 22" fill="none"><path d="M11 2 3 11l8 9" stroke={ico} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
const Ellipsis = () => <svg width="22" height="22" viewBox="0 0 22 22" fill={ico}><circle cx="5" cy="11" r="1.8"/><circle cx="11" cy="11" r="1.8"/><circle cx="17" cy="11" r="1.8"/></svg>
const PersonIcon = () => <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="3.4" r="2.2"/><path d="M1.6 11c0-2.4 2-3.8 4.4-3.8s4.4 1.4 4.4 3.8"/></svg>
const Play = () => <svg width="26" height="26" viewBox="0 0 26 26" fill={ico}><path d="M8 5.5v15l12-7.5L8 5.5Z"/></svg>
const Pause = () => <svg width="26" height="26" viewBox="0 0 26 26" fill={ico}><rect x="7" y="5.5" width="4" height="15" rx="1.3"/><rect x="15" y="5.5" width="4" height="15" rx="1.3"/></svg>
const MuteOff = () => <svg width="22" height="22" viewBox="0 0 24 24" fill={ico}><path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="m16 9 5 5m0-5-5 5" stroke={ico} strokeWidth="1.8" strokeLinecap="round"/></svg>
const MuteOn = () => <svg width="22" height="22" viewBox="0 0 24 24" fill={ico}><path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 8.5a4 4 0 0 1 0 7" stroke={ico} strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
const Share = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" stroke={ico} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 11H5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h-1" stroke={ico} strokeWidth="2" strokeLinecap="round"/></svg>
const Info = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.2" stroke={ico} strokeWidth="1.8"/><circle cx="12" cy="8" r="1.1" fill={ico}/><path d="M12 11v6" stroke={ico} strokeWidth="1.9" strokeLinecap="round"/></svg>
const Sliders = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ico} strokeWidth="1.9" strokeLinecap="round"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2" fill="white"/><circle cx="8" cy="16" r="2.2" fill="white"/></svg>
const Trash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ico} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>
function Heart({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9">
      <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 7.6 3.9 3.9 0 0 1 19 10.6C19 15.4 12 20 12 20Z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
