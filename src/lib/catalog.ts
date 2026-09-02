// Query layer over the video catalog for the MCP server (/api/mcp).
// Joins videos.ts with chapters, enrichment, transcripts, and X metrics.

import { getChaptersForVideo } from '@/data/chapters'
import { videos } from '@/data/videos'
import { beatStats } from '@/lib/beats'
import { getEnrichment, getTranscript, transcriptText } from '@/lib/enrichment'
import { engagementRates, getMetrics } from '@/lib/metrics'
import { LaunchType, StyleTag } from '@/types/enrichment'
import { SITE_URL as SITE } from '@/lib/site'
import { Video } from '@/types/video'

/** Published videos only — drafts have an empty videoUrl. */
export function liveVideos(): Video[] {
  return videos.filter((v) => v.videoUrl)
}

function pathOf(v: Video): string {
  return `${v.companySlug}/${v.slug}`
}

function summary(v: Video) {
  const e = getEnrichment(v.id)
  const m = getMetrics(v.sourceUrl)
  return {
    id: v.id,
    path: pathOf(v),
    url: `${SITE}/${pathOf(v)}`,
    title: v.title,
    company: v.company,
    duration: v.duration,
    aspectRatio: v.aspectRatio,
    publishedDate: v.publishedDate,
    launchType: e?.launchType ?? null,
    styleTags: e?.styleTags ?? [],
    metrics: m ? { impressions: m.impressions, likes: m.likes } : null,
  }
}

export interface SearchParams {
  query?: string
  company?: string
  launchType?: LaunchType
  styleTag?: StyleTag
  aspectRatio?: Video['aspectRatio']
  hasSpeech?: boolean
  minDuration?: number
  maxDuration?: number
  sort?: 'newest' | 'popularity' | 'engagement'
  limit?: number
  offset?: number
}

export function searchVideos(params: SearchParams) {
  const words = (params.query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  let result = liveVideos().filter((v) => {
    const e = getEnrichment(v.id)
    if (params.company && v.companySlug !== params.company.toLowerCase()) return false
    if (params.launchType && e?.launchType !== params.launchType) return false
    if (params.styleTag && !e?.styleTags.includes(params.styleTag)) return false
    if (params.aspectRatio && v.aspectRatio !== params.aspectRatio) return false
    if (params.hasSpeech !== undefined && (e?.audio.hasSpeech ?? false) !== params.hasSpeech) return false
    if (params.minDuration && v.duration < params.minDuration) return false
    if (params.maxDuration && v.duration > params.maxDuration) return false
    if (words.length > 0) {
      const haystack = [
        v.title, v.company, v.description, v.slug,
        transcriptText(v.id),
        (e?.onScreenText ?? []).map((o) => o.text).join(' '),
        e?.visualSummary ?? '',
      ].join(' ').toLowerCase()
      if (!words.every((w) => haystack.includes(w))) return false
    }
    return true
  })

  const impressions = (v: Video) => getMetrics(v.sourceUrl)?.impressions ?? -1
  const engagement = (v: Video) => engagementRates(getMetrics(v.sourceUrl))?.engagementRate ?? -1
  if (params.sort === 'popularity') result.sort((a, b) => impressions(b) - impressions(a))
  else if (params.sort === 'engagement') result.sort((a, b) => engagement(b) - engagement(a))
  else result = result.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))

  const limit = Math.min(params.limit ?? 20, 50)
  const offset = params.offset ?? 0
  const page = result.slice(offset, offset + limit)
  return {
    total: result.length,
    offset,
    returned: page.length,
    videos: page.map(summary),
  }
}

export function getVideoDetail(ref: string) {
  const v = liveVideos().find((x) => x.id === ref || pathOf(x) === ref.toLowerCase())
  if (!v) return null
  const e = getEnrichment(v.id)
  const m = getMetrics(v.sourceUrl)
  const chapters = getChaptersForVideo(v.id)
  return {
    ...summary(v),
    description: v.description,
    featured: v.featured,
    websiteUrl: v.websiteUrl,
    twitterUrl: v.twitterUrl,
    sourceUrl: v.sourceUrl,
    thumbnailUrl: v.thumbnailUrl,
    streamUrl: v.videoUrl,
    credits: v.credits,
    chapters,
    beatStats: beatStats(chapters, v.duration),
    enrichment: e
      ? {
          visualSummary: e.visualSummary,
          onScreenText: e.onScreenText,
          pacing: e.pacing,
          audio: e.audio,
          palette: e.palette,
          lightDark: e.lightDark,
        }
      : null,
    transcript: getTranscript(v.id)?.segments ?? [],
    metrics: m ? { ...m, rates: engagementRates(m) } : null,
  }
}

export function listCompanies() {
  const bySlug = new Map<string, { company: string; companySlug: string; founded?: number; videos: { title: string; path: string }[] }>()
  for (const v of liveVideos()) {
    const entry = bySlug.get(v.companySlug) ?? { company: v.company, companySlug: v.companySlug, founded: v.companyFounded, videos: [] }
    entry.videos.push({ title: v.title, path: pathOf(v) })
    bySlug.set(v.companySlug, entry)
  }
  return [...bySlug.values()]
    .map((c) => ({ ...c, videoCount: c.videos.length }))
    .sort((a, b) => b.videoCount - a.videoCount || a.company.localeCompare(b.company))
}

export function searchTranscripts(query: string, limit = 10) {
  const q = query.toLowerCase()
  const hits = []
  for (const v of liveVideos()) {
    const matches: { time: number; text: string; source: 'speech' | 'on-screen' }[] = []
    for (const s of getTranscript(v.id)?.segments ?? []) {
      if (s.text.toLowerCase().includes(q)) matches.push({ time: Math.round(s.start), text: s.text, source: 'speech' })
    }
    for (const o of getEnrichment(v.id)?.onScreenText ?? []) {
      if (o.text.toLowerCase().includes(q)) matches.push({ time: o.time, text: o.text, source: 'on-screen' })
    }
    if (matches.length > 0) {
      hits.push({
        path: pathOf(v),
        title: v.title,
        company: v.company,
        url: `${SITE}/${pathOf(v)}`,
        matches: matches.sort((a, b) => a.time - b.time).slice(0, 6),
      })
    }
  }
  return { total: hits.length, results: hits.slice(0, Math.min(limit, 25)) }
}
