// Enrichment backfill — extraction harness (sibling of chapterize.mjs).
//
// For each video it downloads the Mux .m3u8 once, then computes everything
// mechanical on the local copy:
//   1. transcript.json / .txt — Whisper segments with timestamps
//   2. cuts + cuts/min + avg shot length — ffmpeg scene detection
//   3. audio profile — hasSpeech, speechShare, language, hasMusic (heuristic:
//      audio energy in the longest non-speech gaps)
//   4. palette + light/dark — Pillow over sampled frames (_palette.py)
//   5. montage_*.jpg — timestamped contact sheets at 2fps for the model pass
//
// It does NOT call a model. The vision step (style tags, launch type,
// on-screen text, visual summary) reads the montages + transcript and writes
// analysis.json per video via a subagent; enrich-merge.mjs folds everything
// into src/data/enrichment.json + src/data/transcripts.json.
//
// Usage:
//   node scripts/enrich.mjs 8 49       # specific video ids
//   node scripts/enrich.mjs missing    # only ids without an extract.json
//   node scripts/enrich.mjs all        # every video
// Flags:
//   --model=small       whisper model (tiny|base|small|medium)
//   --concurrency=3     videos processed in parallel
//   --force             re-extract even if extract.json exists

import { execFile as execFileCb, execFileSync } from 'child_process'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const execFile = promisify(execFileCb)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env') })
dotenv.config({ path: path.join(ROOT, '.env.local') })
const VIDEOS_TS = path.join(ROOT, 'src/data/videos.ts')
const OUT_ROOT = process.env.ENRICH_OUT || path.join(ROOT, 'uploads', 'enrich')
const MONTAGE_FPS = 2
const SCENE_THRESHOLD = 0.35

// --- arg parsing ---------------------------------------------------------
const rawArgs = process.argv.slice(2)
const flags = Object.fromEntries(
  rawArgs.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const selectors = rawArgs.filter((a) => !a.startsWith('--'))
const WHISPER_MODEL = flags.model ?? 'small'
const CONCURRENCY = Number(flags.concurrency ?? 3)
const FORCE = flags.force === true

// --- parse videos.ts -----------------------------------------------------
function parseVideos() {
  const src = fs.readFileSync(VIDEOS_TS, 'utf8')
  const matches = [...src.matchAll(/\bid: '(\d+)'/g)]
  const videos = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : src.length
    const slice = src.slice(start, end)
    const pick = (re) => (slice.match(re)?.[1] ?? null)
    videos.push({
      id: matches[i][1],
      videoUrl: pick(/videoUrl: '([^']*)'/),
      duration: Number(pick(/duration: (\d+)/) ?? 0),
      aspectRatio: pick(/aspectRatio: '([^']*)'/),
      title: pick(/\btitle: '([^']*)'/),
      company: pick(/\bcompany: '([^']*)'/),
      companySlug: pick(/companySlug: '([^']*)'/),
      slug: pick(/\bslug: '([^']*)'/),
    })
  }
  return videos
}

// --- steps ---------------------------------------------------------------
async function run(cmd, args) {
  return execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 })
}

async function download(url, dir) {
  const out = path.join(dir, 'video.mp4')
  await run('ffmpeg', ['-y', '-i', url, '-c', 'copy', out])
  return out
}

async function hasAudioStream(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type',
    '-of', 'csv=p=0', file,
  ])
  return stdout.trim().length > 0
}

async function extractAudio(mp4, dir) {
  const out = path.join(dir, 'audio.wav')
  await run('ffmpeg', ['-y', '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', out])
  return out
}

// whisper-1 verbose_json reports full language names; local whisper uses codes
const LANG_CODES = {
  english: 'en', german: 'de', french: 'fr', spanish: 'es', italian: 'it',
  portuguese: 'pt', dutch: 'nl', japanese: 'ja', korean: 'ko', chinese: 'zh',
  swedish: 'sv', danish: 'da', norwegian: 'no', polish: 'pl', turkish: 'tr',
  hindi: 'hi', russian: 'ru',
}

function writeTranscript(data, dir) {
  // Drop hallucinated segments — whisper invents captions over music/SFX.
  // High no_speech_prob or a very poor logprob marks those.
  let segments = (data.segments ?? [])
    .filter((s) => (s.no_speech_prob ?? 0) < 0.6 && (s.avg_logprob ?? 0) > -1.0)
    .map((s) => ({ start: Math.round(s.start * 10) / 10, end: Math.round(s.end * 10) / 10, text: s.text.trim() }))
    .filter((s) => s.text.length > 0)
  // Degenerate-transcript check: music-only audio makes whisper count numbers
  // or loop the same phrase. Mostly-numeric or mostly-duplicate output = no speech.
  if (segments.length >= 5) {
    const texts = segments.map((s) => s.text)
    const numericish = texts.filter((t) => /^[\d\s.,:%\-]+$/.test(t)).length
    const unique = new Set(texts).size
    if (numericish / texts.length > 0.5 || unique / texts.length < 0.3) segments = []
  }
  const language = LANG_CODES[data.language] ?? data.language ?? null
  fs.writeFileSync(path.join(dir, 'transcript.json'), JSON.stringify({ language, segments }, null, 2))
  fs.writeFileSync(
    path.join(dir, 'transcript.txt'),
    segments.map((s) => `[${fmt(s.start)}] ${s.text}`).join('\n'),
  )
  return { language, segments }
}

async function transcribeRemote(wav, dir) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    const form = new FormData()
    form.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), 'audio.wav')
    form.append('model', 'whisper-1')
    form.append('response_format', 'verbose_json')
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    }).catch((e) => ({ ok: false, status: 'network', text: async () => e.message }))
    if (res.ok) return writeTranscript(await res.json(), dir)
    lastErr = `openai transcription ${res.status}: ${(await res.text()).slice(0, 200)}`
    if (String(res.status) === '401') break // bad key — retrying won't help
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  throw new Error(lastErr)
}

async function transcribeLocal(wav, dir) {
  await run('whisper', [
    wav, '--model', WHISPER_MODEL, '--output_format', 'json',
    '--output_dir', dir, '--verbose', 'False',
  ])
  const jsonPath = path.join(dir, 'audio.json')
  if (!fs.existsSync(jsonPath)) return null
  return writeTranscript(JSON.parse(fs.readFileSync(jsonPath, 'utf8')), dir)
}

const transcribe = process.env.OPENAI_API_KEY ? transcribeRemote : transcribeLocal

async function countCuts(mp4, dir) {
  const metaFile = path.join(dir, 'scdet.txt')
  await run('ffmpeg', [
    '-y', '-i', mp4, '-an',
    '-vf', `select='gt(scene,${SCENE_THRESHOLD})',metadata=print:file=${metaFile}`,
    '-f', 'null', '-',
  ])
  const txt = fs.existsSync(metaFile) ? fs.readFileSync(metaFile, 'utf8') : ''
  fs.rmSync(metaFile, { force: true })
  return (txt.match(/pts_time/g) ?? []).length
}

async function meanVolume(wav, start, len) {
  const args = ['-y']
  if (start != null) args.push('-ss', String(start), '-t', String(len))
  args.push('-i', wav, '-af', 'volumedetect', '-f', 'null', '-')
  const { stderr } = await run('ffmpeg', args)
  const m = stderr.match(/mean_volume: (-?[\d.]+) dB/)
  return m ? Number(m[1]) : -91
}

// Music heuristic: measure audio energy where nobody is speaking. Loud
// non-speech gaps (or a loud speechless track) mean a music bed.
async function detectMusic(wav, segments, duration) {
  if (!segments || segments.length === 0) {
    return (await meanVolume(wav)) > -50
  }
  const gaps = []
  let cursor = 0
  for (const s of segments) {
    if (s.start - cursor >= 2) gaps.push({ start: cursor, len: s.start - cursor })
    cursor = Math.max(cursor, s.end)
  }
  if (duration - cursor >= 2) gaps.push({ start: cursor, len: duration - cursor })
  gaps.sort((a, b) => b.len - a.len)
  for (const g of gaps.slice(0, 3)) {
    if ((await meanVolume(wav, g.start, g.len)) > -45) return true
  }
  return false
}

async function buildMontages(mp4, dir, aspectRatio) {
  const mf = path.join(dir, 'mframes')
  fs.mkdirSync(mf, { recursive: true })
  await run('ffmpeg', ['-y', '-i', mp4, '-vf', `fps=${MONTAGE_FPS},scale=240:-1`, '-q:v', '3', path.join(mf, 'm_%05d.jpg')])

  // palette from the same frames, before tiling
  const { stdout: palOut } = await run('python3', [path.join(__dirname, '_palette.py'), mf])
  const paletteInfo = JSON.parse(palOut.trim())

  // portrait sheets get fewer, larger cells so downscaling keeps text legible
  const portrait = aspectRatio === '9:16' || aspectRatio === '4:5'
  const [cols, rows, cellW] = portrait ? ['4', '3', '260'] : ['6', '6', '240']
  const { stdout } = await run('python3', [
    path.join(__dirname, '_montage.py'), mf, dir, String(MONTAGE_FPS), cols, rows, cellW,
  ])
  fs.rmSync(mf, { recursive: true, force: true })
  return { sheets: Number(stdout.trim()) || 0, ...paletteInfo }
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// --- per-video pipeline --------------------------------------------------
async function enrichOne(v) {
  const dir = path.join(OUT_ROOT, v.id)
  if (fs.existsSync(path.join(dir, 'extract.json')) && !FORCE) {
    console.log(`↩︎  id ${v.id} (${v.title}): already extracted, skip`)
    return
  }
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  console.log(`▶︎ id ${v.id}: ${v.company} — ${v.title} (${v.duration}s)`)

  const mp4 = await download(v.videoUrl, dir)

  let tr = null
  let hasMusic = false
  const audible = await hasAudioStream(mp4)
  if (audible) {
    const wav = await extractAudio(mp4, dir)
    tr = await transcribe(wav, dir)
    hasMusic = await detectMusic(wav, tr?.segments, v.duration)
    fs.rmSync(wav, { force: true })
    fs.rmSync(path.join(dir, 'audio.json'), { force: true })
  }

  const cuts = await countCuts(mp4, dir)
  const { sheets, palette, lightDark } = await buildMontages(mp4, dir, v.aspectRatio)
  fs.rmSync(mp4, { force: true })

  const speech = tr?.segments ?? []
  const speechSeconds = speech.reduce((acc, s) => acc + (s.end - s.start), 0)
  const extract = {
    id: v.id,
    title: v.title,
    company: v.company,
    companySlug: v.companySlug,
    slug: v.slug,
    duration: v.duration,
    aspectRatio: v.aspectRatio,
    montageFps: MONTAGE_FPS,
    sheets,
    pacing: {
      cuts,
      cutsPerMinute: v.duration ? Math.round((cuts / (v.duration / 60)) * 10) / 10 : 0,
      avgShotSeconds: Math.round((v.duration / (cuts + 1)) * 10) / 10,
    },
    audio: {
      hasAudio: audible,
      hasSpeech: speech.length > 0,
      speechShare: v.duration ? Math.round((speechSeconds / v.duration) * 100) / 100 : 0,
      language: speech.length > 0 ? tr?.language ?? null : null,
      hasMusic,
    },
    palette,
    lightDark,
  }
  fs.writeFileSync(path.join(dir, 'extract.json'), JSON.stringify(extract, null, 2))
  console.log(`   ✓ id ${v.id}: ${cuts} cuts · speech ${extract.audio.speechShare} · music ${hasMusic} · ${sheets} sheet(s)`)
}

// --- main ----------------------------------------------------------------
function selectIds(videos) {
  if (selectors.includes('all')) return videos.map((v) => v.id)
  if (selectors.includes('missing')) {
    return videos
      .filter((v) => !fs.existsSync(path.join(OUT_ROOT, v.id, 'extract.json')))
      .map((v) => v.id)
  }
  return selectors
}

async function main() {
  try {
    execFileSync('which', ['whisper', 'ffmpeg', 'ffprobe', 'python3'])
  } catch {
    console.error('Needs whisper, ffmpeg, ffprobe, python3 on PATH.')
    process.exit(1)
  }
  const videos = parseVideos().filter((v) => v.videoUrl)
  const byId = Object.fromEntries(videos.map((v) => [v.id, v]))
  const ids = selectIds(videos)
  if (ids.length === 0) {
    console.log('No ids selected (or all done). Pass ids, or "missing" / "all".')
    return
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true })
  const mode = process.env.OPENAI_API_KEY ? 'openai whisper-1 (remote)' : `local whisper ${WHISPER_MODEL}`
  console.log(`Enriching ${ids.length} video(s) · ${mode} · concurrency ${CONCURRENCY}\n`)

  const queue = ids.map((id) => byId[id]).filter(Boolean)
  const failed = []
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const v = queue.shift()
      try {
        await enrichOne(v)
      } catch (err) {
        failed.push(v.id)
        console.log(`   ✗ id ${v.id} failed: ${String(err.message).split('\n')[0]}`)
      }
    }
  })
  await Promise.all(workers)

  if (failed.length > 0) console.log(`\n⚠️  failed ids: ${failed.join(' ')}`)
  console.log(`✅ Done. Outputs in ${OUT_ROOT}`)
}

main()
