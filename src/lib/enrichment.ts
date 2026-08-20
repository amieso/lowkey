import enrichmentData from '@/data/enrichment.json'
import transcriptsData from '@/data/transcripts.json'
import { VideoEnrichment, VideoTranscript } from '@/types/enrichment'

const enrichment = enrichmentData as Record<string, VideoEnrichment>
const transcripts = transcriptsData as Record<string, VideoTranscript>

/** Derived per-video data (style, pacing, audio, launch type), or null. */
export function getEnrichment(videoId: string): VideoEnrichment | null {
  return enrichment[videoId] ?? null
}

/** Whisper transcript with timestamped segments, or null (no speech / not yet run). */
export function getTranscript(videoId: string): VideoTranscript | null {
  const t = transcripts[videoId]
  return t && t.segments.length > 0 ? t : null
}

/** Plain-text transcript for search / model input. */
export function transcriptText(videoId: string): string {
  return getTranscript(videoId)?.segments.map((s) => s.text).join(' ') ?? ''
}
