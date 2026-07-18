// Ingest launch videos into lowkey from x.com / YouTube links (or local files).
//
//   npm run ingest "https://x.com/user/status/123"            download + upload + draft
//   npm run ingest "https://youtu.be/abc" "https://x.com/..."  multiple at once
//   npm run ingest ./path/to/local.mp4                         skip the download step
//   npm run ingest "<url>" --no-upload                         download + draft, no Mux
//
// Each input becomes a draft `Video` in src/data/videos.ts with empty playback
// URLs. Run `npm run publish` afterwards to fill them once Mux finishes encoding.

import fs from 'fs'
import path from 'path'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'
import Mux from '@mux/mux-node'

import {
  ensureDirectories,
  UPLOADS_DIR,
  PROCESSED_DIR,
  FAILED_DIR,
  VIDEO_EXTENSIONS,
  readState,
  writeState,
  existingVideoKeys,
  nextVideoId,
  slugify,
  uniqueSlug,
  renderDraftEntry,
  appendDraftEntry,
  calculateChecksum,
} from './ingest-lib.mjs'

dotenv.config()
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const execPromise = promisify(exec)

const rawArgs = process.argv.slice(2)
const noUpload = rawArgs.includes('--no-upload')
const inputs = rawArgs.filter((a) => !a.startsWith('--'))

const mux =
  !noUpload && process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET
    ? new Mux({ tokenId: process.env.MUX_TOKEN_ID, tokenSecret: process.env.MUX_TOKEN_SECRET })
    : null

function isUrl(input) {
  return /^https?:\/\//i.test(input)
}

async function checkBinary(cmd) {
  try {
    await execPromise(cmd)
    return true
  } catch {
    return false
  }
}

// Download a remote video with yt-dlp. Returns { filePath, info } where info is
// yt-dlp's JSON metadata (uploader, title, original url, ...).
async function download(url) {
  const outputTemplate = path.join(UPLOADS_DIR, '%(uploader_id)s-%(id)s.%(ext)s')
  const args = [
    // `bv*` (note the asterisk) considers progressive/muxed streams too, and
    // `-S res,tbr` ranks by resolution then total bitrate. X often serves the
    // same resolution at both a low-bitrate HLS and a high-bitrate progressive
    // rendition — without this we'd grab the low one and the video looks soft.
    '--format', 'bv*+ba/b',
    '--format-sort', 'res,tbr',
    '--merge-output-format', 'mp4',
    '--output', outputTemplate,
    '--no-playlist',
    '--no-warnings',
    '--print', 'after_move:%()j', // print the full info JSON after the file lands
    url,
  ]
  if (process.env.TWITTER_COOKIES_FILE) {
    args.unshift('--cookies', process.env.TWITTER_COOKIES_FILE)
  }

  console.log(`  📥 Downloading…`)
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('error', (e) => reject(new Error(`Failed to spawn yt-dlp: ${e.message}`)))
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp exited ${code}: ${stderr.trim()}`))
      try {
        const info = JSON.parse(stdout.trim().split('\n').pop())
        const filePath = info.filepath || info._filename
        if (!filePath || !fs.existsSync(filePath)) {
          return reject(new Error('Downloaded file not found in yt-dlp output'))
        }
        console.log(`  ✅ Downloaded: ${path.basename(filePath)}`)
        resolve({ filePath, info })
      } catch (e) {
        reject(new Error(`Could not parse yt-dlp output: ${e.message}`))
      }
    })
  })
}

// Must stay in sync with the Video['aspectRatio'] union in src/types/video.ts.
const SUPPORTED_ASPECT_RATIOS = { '16:9': 16 / 9, '4:5': 4 / 5, '1:1': 1, '9:16': 9 / 16 }

function nearestAspectRatio(width, height) {
  if (!width || !height) return '16:9'
  const ratio = width / height
  let best = '16:9'
  let bestDistance = Infinity
  for (const [name, value] of Object.entries(SUPPORTED_ASPECT_RATIOS)) {
    const distance = Math.abs(ratio - value) / value
    if (distance < bestDistance) {
      bestDistance = distance
      best = name
    }
  }
  return best
}

async function getMetadata(videoPath) {
  const escaped = videoPath.replace(/'/g, "'\\''")
  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams '${escaped}'`
  const { stdout } = await execPromise(cmd)
  const meta = JSON.parse(stdout)
  const stream = meta.streams.find((s) => s.codec_type === 'video')
  const width = stream?.width ?? 0
  const height = stream?.height ?? 0
  return {
    duration: Math.round(parseFloat(meta.format.duration) || 0),
    width,
    height,
    // Snap to the nearest ratio the player can size a box for (see
    // expandedWidth in video-card.tsx). Picking the closest by relative
    // distance keeps 4:5 portrait from being flattened into 9:16.
    aspectRatio: nearestAspectRatio(width, height),
  }
}

async function uploadToMux(videoPath) {
  console.log(`  📤 Uploading to Mux…`)
  const upload = await mux.video.uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: 'plus',
    },
  })
  const fileBuffer = fs.readFileSync(videoPath)
  const res = await fetch(upload.url, {
    method: 'PUT',
    body: fileBuffer,
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(fileBuffer.length) },
  })
  if (!res.ok) throw new Error(`Mux upload PUT failed: ${res.status} ${res.statusText}`)
  console.log(`  ✅ Uploaded to Mux (upload ${upload.id})`)
  return upload.id
}

// Guess company + title from yt-dlp metadata (used only to seed TODO placeholders).
function guessFields(info, fallbackName) {
  const uploaderId = (info?.uploader_id || '').replace(/^@/, '')
  const companyGuess = info?.uploader || uploaderId || fallbackName
  const companySlug = slugify(uploaderId || companyGuess || fallbackName) || 'company'
  const titleGuess = info?.title || fallbackName
  const sourceUrl = info?.webpage_url || info?.original_url || ''
  const publishedDate = info?.upload_date
    ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}`
    : undefined
  return { companyGuess, companySlug, titleGuess, sourceUrl, publishedDate }
}

async function ingestOne(input) {
  console.log(`\n🔗 ${input}`)

  let filePath
  let info = null
  try {
    if (isUrl(input)) {
      if (!(await checkBinary('yt-dlp --version'))) {
        throw new Error('yt-dlp not found. Install it: brew install yt-dlp')
      }
      ;({ filePath, info } = await download(input))
    } else {
      filePath = path.resolve(input)
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)
      console.log(`  📂 Using local file: ${path.basename(filePath)}`)
    }

    // Dedup: same source URL already in videos.ts, or identical file in flight.
    const checksum = calculateChecksum(filePath)
    const { sourceUrls } = existingVideoKeys()
    const state = readState()
    if (isUrl(input) && sourceUrls.has(input)) {
      console.log(`  ⏭️  Already in videos.ts (source URL). Skipping.`)
      return null
    }
    if (state.pending.some((p) => p.checksum === checksum)) {
      console.log(`  ⏭️  Identical file already pending Mux. Skipping.`)
      return null
    }

    const meta = await getMetadata(filePath)
    console.log(`  📊 ${meta.duration}s · ${meta.width}x${meta.height} · ${meta.aspectRatio}`)

    let uploadId = null
    if (mux) {
      uploadId = await uploadToMux(filePath)
    } else if (!noUpload) {
      console.log(`  ⚠️  Mux credentials missing — writing draft without upload.`)
    }

    const fallbackName = path.parse(filePath).name
    const guess = guessFields(info, fallbackName)
    const id = nextVideoId()
    const slug = uniqueSlug(guess.companySlug, slugify(guess.titleGuess).split('-').slice(0, 3).join('-'))

    const draft = {
      id,
      slug,
      companySlug: guess.companySlug,
      companyGuess: guess.companyGuess,
      titleGuess: guess.titleGuess,
      sourceUrl: guess.sourceUrl || (isUrl(input) ? input : ''),
      publishedDate: guess.publishedDate,
      duration: meta.duration,
      aspectRatio: meta.aspectRatio,
      uploadId: uploadId || `none-${id}`,
    }

    appendDraftEntry(renderDraftEntry(draft))
    console.log(`  📝 Draft added to videos.ts → ${draft.companySlug}/${draft.slug} (id ${id})`)

    // Track in-flight upload so `publish` can resolve the playback id later.
    if (uploadId) {
      state.pending.push({
        id,
        uploadId,
        checksum,
        slug,
        companySlug: draft.companySlug,
        sourceUrl: draft.sourceUrl,
        addedAt: new Date().toISOString(),
      })
      writeState(state)
    }

    // Park the processed source file out of the uploads root.
    if (fs.existsSync(filePath) && path.dirname(filePath) === UPLOADS_DIR) {
      fs.renameSync(filePath, path.join(PROCESSED_DIR, path.basename(filePath)))
    }

    return { id, slug, companySlug: draft.companySlug }
  } catch (e) {
    console.error(`  ❌ ${e.message}`)
    if (filePath && fs.existsSync(filePath) && path.dirname(filePath) === UPLOADS_DIR) {
      fs.renameSync(filePath, path.join(FAILED_DIR, path.basename(filePath)))
    }
    return null
  }
}

async function main() {
  if (inputs.length === 0) {
    console.log('Usage: npm run ingest "<url-or-file>" [more…] [--no-upload]')
    console.log('  Supports x.com / twitter.com / youtube.com links, or local video files.')
    return
  }

  ensureDirectories()
  if (!mux && !noUpload) {
    console.log('⚠️  MUX_TOKEN_ID / MUX_TOKEN_SECRET not set — drafts will have no playback URLs.')
    console.log('   Add them to .env.local (see .env.example), or pass --no-upload to silence this.\n')
  }

  const results = []
  for (const input of inputs) {
    const r = await ingestOne(input)
    if (r) results.push(r)
  }

  console.log(`\n📊 Ingested ${results.length}/${inputs.length}`)
  if (results.length > 0) {
    console.log('\nNext steps:')
    console.log('  1. Run `npm run publish` (repeat until ready) to fill playback URLs.')
    console.log('  2. Replace the TODO fields for each new entry in src/data/videos.ts.')
  }
}

main().catch((e) => {
  console.error('\n❌ Fatal:', e)
  process.exit(1)
})
