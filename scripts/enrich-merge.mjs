// Folds uploads/enrich/<id>/{extract,transcript,analysis}.json into
// src/data/enrichment.json + src/data/transcripts.json. Idempotent — run it
// whenever more videos have been extracted/analyzed. analysis.json (from the
// model pass over the montages) is optional; mechanical fields merge without it.
//
// Usage: node scripts/enrich-merge.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IN_ROOT = process.env.ENRICH_OUT || path.join(ROOT, 'uploads', 'enrich')
const ENRICHMENT_JSON = path.join(ROOT, 'src/data/enrichment.json')
const TRANSCRIPTS_JSON = path.join(ROOT, 'src/data/transcripts.json')

const LAUNCH_TYPES = new Set(['product-launch', 'feature-release', 'model-release', 'funding', 'rebrand', 'other'])
const STYLE_TAGS = new Set([
  'screen-recording', 'product-ui', 'motion-graphics', '3d-render', 'live-action',
  'talking-head', 'kinetic-typography', 'animation', 'cinematic', 'mixed-media',
])

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

// Whisper hallucination catch-all beyond the extraction-time filter: subtitle
// credits, "thanks for watching", and degenerate one-word transcripts.
const JUNK_RE = /transcribed by|translated by|subtitles? by|sous-titres|amara\.org|thanks? (you )?for watching/i

// Videos where Whisper hallucinated a full transcript that passes the generic
// filters (verified against the frames by the analysis pass).
const FORCED_NO_SPEECH = new Set([
  '38', // Spielwerk — repeated Japanese filler over music
])

function sanitizeSegments(segments, id) {
  if (FORCED_NO_SPEECH.has(id)) return []
  const kept = (segments ?? []).filter((s) => !JUNK_RE.test(s.text))
  const words = new Set(kept.flatMap((s) => s.text.toLowerCase().split(/\s+/).filter(Boolean)))
  if (words.size <= 2 && kept.length > 0) return [] // "you" x3 etc.
  return kept
}

const enrichment = readJson(ENRICHMENT_JSON, {})
const transcripts = readJson(TRANSCRIPTS_JSON, {})

const dirs = fs.existsSync(IN_ROOT)
  ? fs.readdirSync(IN_ROOT).filter((d) => /^\d+$/.test(d))
  : []

let merged = 0
let analyzed = 0
const warnings = []

for (const id of dirs) {
  const extract = readJson(path.join(IN_ROOT, id, 'extract.json'))
  if (!extract) continue

  const analysis = readJson(path.join(IN_ROOT, id, 'analysis.json'))
  if (analysis) {
    if (!LAUNCH_TYPES.has(analysis.launchType)) {
      warnings.push(`id ${id}: unknown launchType '${analysis.launchType}'`)
    }
    for (const tag of analysis.styleTags ?? []) {
      if (!STYLE_TAGS.has(tag)) warnings.push(`id ${id}: unknown styleTag '${tag}'`)
    }
  }

  const tr = readJson(path.join(IN_ROOT, id, 'transcript.json'))
  const segments = sanitizeSegments(tr?.segments, id)
  const speechSeconds = segments.reduce((acc, s) => acc + (s.end - s.start), 0)
  const audio = {
    ...extract.audio,
    hasSpeech: segments.length > 0,
    speechShare: extract.duration ? Math.round((speechSeconds / extract.duration) * 100) / 100 : 0,
    language: segments.length > 0 ? extract.audio.language : null,
  }

  enrichment[id] = {
    launchType: analysis && LAUNCH_TYPES.has(analysis.launchType) ? analysis.launchType : null,
    styleTags: (analysis?.styleTags ?? []).filter((t) => STYLE_TAGS.has(t)),
    visualSummary: analysis?.visualSummary ?? null,
    onScreenText: (analysis?.onScreenText ?? [])
      .filter((o) => typeof o.time === 'number' && typeof o.text === 'string' && o.text.trim())
      .map((o) => ({ time: Math.round(o.time), text: o.text.trim() })),
    pacing: extract.pacing,
    audio,
    palette: extract.palette ?? [],
    lightDark: extract.lightDark ?? 'dark',
  }
  merged++
  if (analysis) analyzed++

  transcripts[id] = segments.length > 0
    ? { language: tr?.language ?? null, segments }
    : { language: null, segments: [] }
}

const sortNum = (obj) =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => Number(a) - Number(b)))

fs.writeFileSync(ENRICHMENT_JSON, JSON.stringify(sortNum(enrichment), null, 2) + '\n')
fs.writeFileSync(TRANSCRIPTS_JSON, JSON.stringify(sortNum(transcripts), null, 2) + '\n')

for (const w of warnings) console.log(`⚠️  ${w}`)
console.log(`✅ merged ${merged} video(s) (${analyzed} with model analysis) → src/data/enrichment.json + transcripts.json`)
