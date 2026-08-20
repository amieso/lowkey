import { Chapter, ChapterBeat } from '@/types/video'

const BEATS: ChapterBeat[] = ['hook', 'problem', 'solution', 'in-action', 'proof', 'cta']

export interface BeatStats {
  seconds: Record<ChapterBeat, number>
  share: Record<ChapterBeat, number> // 0..1 fraction of runtime
  hasColdOpen: boolean // opens on a hook
  skipsProblem: boolean // never states a pain point
  demoShare: number // fraction of runtime that is product in action
  timeToProduct: number | null // seconds until the first solution/in-action beat
}

/** Structural stats from a video's chapter beats. Null when beats are absent. */
export function beatStats(chapters: Chapter[], duration: number): BeatStats | null {
  const beaten = chapters.filter((c) => c.beat)
  if (beaten.length === 0 || duration <= 0) return null

  const seconds = Object.fromEntries(BEATS.map((b) => [b, 0])) as Record<ChapterBeat, number>
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i]
    if (!c.beat) continue
    const end = i + 1 < chapters.length ? chapters[i + 1].startTime : duration
    seconds[c.beat] += Math.max(0, end - c.startTime)
  }
  const share = Object.fromEntries(
    BEATS.map((b) => [b, Math.round((seconds[b] / duration) * 100) / 100]),
  ) as Record<ChapterBeat, number>

  const firstProduct = chapters.find((c) => c.beat === 'solution' || c.beat === 'in-action')
  return {
    seconds,
    share,
    hasColdOpen: chapters[0]?.beat === 'hook',
    skipsProblem: seconds.problem === 0,
    demoShare: share['in-action'],
    timeToProduct: firstProduct ? firstProduct.startTime : null,
  }
}
