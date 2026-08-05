// Chapterize backfill — extraction harness.
//
// For each video it pulls frames + audio straight from the Mux .m3u8 (no
// yt-dlp, no source re-download, no login gating), then produces three things
// on disk for a human/model to turn into chapters:
//   1. frames/       — raw 10fps stills (320px), the literal dense sampling
//   2. montage_*.jpg — timestamped contact sheets (tiled, for quick reading)
//   3. transcript.json / .txt — Whisper segments with timestamps
//
// It does NOT call a model. The vision+segmentation step reads the montages
// and transcript and writes Chapter[] into src/data/chapters.ts by hand /
// via a subagent. This keeps the script dependency-free (no API key).
//
// Usage:
//   node scripts/chapterize.mjs 8 49            # specific video ids
//   node scripts/chapterize.mjs missing         # only ids without chapters
//   node scripts/chapterize.mjs all             # every video
// Flags:
//   --montage-fps=4   frames per second in the contact sheets (density)
//   --model=small     whisper model (tiny|base|small|medium)
//   --no-frames       skip the raw 10fps dump, montages only
//   --force           re-extract even if the output dir already exists

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VIDEOS_TS = path.join(ROOT, 'src/data/videos.ts')
const CHAPTERS_TS = path.join(ROOT, 'src/data/chapters.ts')
const OUT_ROOT = process.env.CHAPTERIZE_OUT
  || '/private/tmp/claude-501/-Users-dennismueller-dev-lowkey/94ea41a2-d7df-4db3-bf18-f036b0296376/scratchpad/chapterize'
const FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
const FRAME_FPS = 10

// --- arg parsing ---------------------------------------------------------
const rawArgs = process.argv.slice(2)
const flags = Object.fromEntries(
  rawArgs.filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const selectors = rawArgs.filter((a) => !a.startsWith('--'))
const MONTAGE_FPS = Number(flags['montage-fps'] ?? 4)
const WHISPER_MODEL = flags.model ?? 'small'
const SKIP_FRAMES = flags['no-frames'] === true
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
      title: pick(/\btitle: '([^']*)'/),
      company: pick(/\bcompany: '([^']*)'/),
      companySlug: pick(/companySlug: '([^']*)'/),
      slug: pick(/\bslug: '([^']*)'/),
    })
  }
  return videos
}

function existingChapterIds() {
  const src = fs.readFileSync(CHAPTERS_TS, 'utf8')
  return new Set([...src.matchAll(/^  '(\d+)':/gm)].map((m) => m[1]))
}

// --- ffmpeg / whisper steps ---------------------------------------------
function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
}

function extractAudio(url, dir) {
  const out = path.join(dir, 'audio.wav')
  run('ffmpeg', ['-y', '-i', url, '-vn', '-ac', '1', '-ar', '16000', out])
  return out
}

function transcribe(wav, dir) {
  // openai-whisper CLI → JSON with segment-level timestamps
  run('whisper', [
    wav, '--model', WHISPER_MODEL, '--output_format', 'json',
    '--output_dir', dir, '--verbose', 'False',
  ])
  const jsonPath = path.join(dir, 'audio.json')
  if (!fs.existsSync(jsonPath)) return null
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const segments = (data.segments ?? []).map((s) => ({
    start: Math.round(s.start),
    text: s.text.trim(),
  }))
  fs.writeFileSync(path.join(dir, 'transcript.json'), JSON.stringify(segments, null, 2))
  fs.writeFileSync(
    path.join(dir, 'transcript.txt'),
    segments.map((s) => `[${fmt(s.start)}] ${s.text}`).join('\n'),
  )
  return { language: data.language, segments }
}

function dumpFrames(url, dir) {
  const framesDir = path.join(dir, 'frames')
  fs.mkdirSync(framesDir, { recursive: true })
  run('ffmpeg', [
    '-y', '-i', url,
    '-vf', `fps=${FRAME_FPS},scale=320:-1`,
    '-q:v', '4',
    path.join(framesDir, 'f_%05d.jpg'),
  ])
}

function buildMontages(url, dir) {
  // ffmpeg here has no drawtext (no libfreetype), so: extract plain frames at
  // MONTAGE_FPS, then tile + label them with Pillow (_montage.py), which
  // computes each cell's timecode from its frame index.
  const mf = path.join(dir, 'mframes')
  fs.mkdirSync(mf, { recursive: true })
  run('ffmpeg', ['-y', '-i', url, '-vf', `fps=${MONTAGE_FPS},scale=240:-1`, '-q:v', '3', path.join(mf, 'm_%05d.jpg')])
  const out = execFileSync('python3', [
    path.join(__dirname, '_montage.py'), mf, dir, String(MONTAGE_FPS), '6', '6', '240',
  ], { encoding: 'utf8' }).trim()
  fs.rmSync(mf, { recursive: true, force: true })
  return Number(out) || 0
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// --- main ----------------------------------------------------------------
function selectIds(videos, haveChapters) {
  if (selectors.includes('all')) return videos.map((v) => v.id)
  if (selectors.includes('missing')) return videos.filter((v) => !haveChapters.has(v.id)).map((v) => v.id)
  return selectors
}

function main() {
  const videos = parseVideos()
  const byId = Object.fromEntries(videos.map((v) => [v.id, v]))
  const haveChapters = existingChapterIds()
  const ids = selectIds(videos, haveChapters)
  if (ids.length === 0) {
    console.log('No ids selected. Pass ids, or "missing" / "all".')
    return
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true })
  console.log(`Chapterizing ${ids.length} video(s) · montage ${MONTAGE_FPS}fps · whisper ${WHISPER_MODEL}\n`)

  const index = []
  for (const id of ids) {
    const v = byId[id]
    if (!v) { console.log(`⚠️  id ${id}: not found in videos.ts`); continue }
    if (!v.videoUrl) { console.log(`⚠️  id ${id} (${v.title}): no videoUrl, skipping`); continue }

    const dir = path.join(OUT_ROOT, id)
    // "done" = has meta.json (written last). A dir without it is a partial/killed
    // run and gets redone, so resume after an interruption is safe.
    if (fs.existsSync(path.join(dir, 'meta.json')) && !FORCE) { console.log(`↩︎  id ${id} (${v.title}): already extracted, skip (--force to redo)`); continue }
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })

    const label = `${v.company} — ${v.title}`
    process.stdout.write(`▶︎ id ${id}: ${label} (${v.duration}s)\n`)

    try {
      process.stdout.write('   audio+transcript… ')
      const wav = extractAudio(v.videoUrl, dir)
      const tr = transcribe(wav, dir)
      process.stdout.write(tr ? `${tr.segments.length} segs (${tr.language})\n` : 'no speech\n')

      process.stdout.write('   montages… ')
      const sheets = buildMontages(v.videoUrl, dir)
      process.stdout.write(`${sheets} sheet(s)\n`)

      if (!SKIP_FRAMES) {
        process.stdout.write('   10fps frames… ')
        dumpFrames(v.videoUrl, dir)
        const n = fs.readdirSync(path.join(dir, 'frames')).length
        process.stdout.write(`${n} frames\n`)
      }

      const meta = { ...v, montageFps: MONTAGE_FPS, sheets, hasSpeech: !!(tr && tr.segments.length) }
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2))
      index.push(meta)
    } catch (err) {
      console.log(`   ✗ failed: ${err.message.split('\n')[0]}`)
    }
  }

  fs.writeFileSync(path.join(OUT_ROOT, 'index.json'), JSON.stringify(index, null, 2))
  console.log(`\n✅ Done. Outputs in ${OUT_ROOT}`)
}

main()
