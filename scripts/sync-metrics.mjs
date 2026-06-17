// Build-time fetch of X (Twitter) public_metrics for each video's sourceUrl.
// Writes src/data/metrics.json keyed by tweet ID. No-ops gracefully when
// X_BEARER_TOKEN is missing or the API errors (e.g. 402 credits) so builds never fail.
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const VIDEOS_FILE = path.join(process.cwd(), 'src/data/videos.ts')
const METRICS_FILE = path.join(process.cwd(), 'src/data/metrics.json')

// Refresh each tweet's counts at most once per week.
const STALE_MS = 7 * 24 * 60 * 60 * 1000

function readExistingMetrics() {
  try {
    return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function tweetIdsFromVideos() {
  const src = fs.readFileSync(VIDEOS_FILE, 'utf8')
  const ids = new Set()
  const re = /sourceUrl:\s*'https?:\/\/(?:x|twitter)\.com\/[^/]+\/status\/(\d+)/g
  let m
  while ((m = re.exec(src))) ids.add(m[1])
  return [...ids]
}

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

async function main() {
  const token = process.env.X_BEARER_TOKEN
  const ids = tweetIdsFromVideos()
  console.log(`📊 sync-metrics: ${ids.length} tweet id(s) found`)

  if (!token) {
    console.log('⚠️  X_BEARER_TOKEN not set — keeping existing metrics.json. Skipping fetch.')
    return
  }

  const metrics = readExistingMetrics()
  const fetchedAt = new Date().toISOString()
  const now = Date.now()

  // Refresh a tweet at most once a week, but always fetch newly added videos
  // (no cached entry) so a freshly ingested video gets its count immediately.
  const toFetch = ids.filter((id) => {
    const cached = metrics[id]
    if (!cached || !cached.fetchedAt) return true // new video — always fetch
    const ageMs = now - new Date(cached.fetchedAt).getTime()
    return ageMs >= STALE_MS // otherwise only when stale (>= 1 week)
  })

  const fresh = ids.length - toFetch.length
  console.log(`   ${fresh} fresh (<1w), ${toFetch.length} to fetch`)
  if (toFetch.length === 0) {
    console.log('✅ sync-metrics: all counts fresh — no API call.')
    return
  }

  let updated = 0

  for (const group of chunk(toFetch, 100)) {
    const url = `https://api.x.com/2/tweets?ids=${group.join(',')}&tweet.fields=public_metrics`
    let res
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    } catch (e) {
      console.log(`⚠️  network error: ${e.message} — keeping existing metrics.`)
      return
    }
    if (!res.ok) {
      const body = await res.text()
      console.log(`⚠️  X API ${res.status}: ${body.slice(0, 200)}`)
      console.log('   Keeping existing metrics.json. (402 = add credits to the X account.)')
      return
    }
    const json = await res.json()
    for (const t of json.data ?? []) {
      const p = t.public_metrics ?? {}
      metrics[t.id] = {
        likes: p.like_count ?? 0,
        replies: p.reply_count ?? 0,
        retweets: p.retweet_count ?? 0,
        quotes: p.quote_count ?? 0,
        bookmarks: p.bookmark_count ?? 0,
        impressions: p.impression_count ?? 0,
        fetchedAt,
      }
      updated++
    }
    for (const err of json.errors ?? []) {
      console.log(`   • skipped ${err.resource_id ?? err.value ?? '?'}: ${err.title ?? err.detail ?? 'error'}`)
    }
  }

  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2) + '\n')
  console.log(`✅ sync-metrics: wrote ${updated} metric record(s) to src/data/metrics.json`)
}

main().catch((e) => {
  console.log(`⚠️  sync-metrics failed: ${e.message} — build will continue.`)
})
