# Video ingest pipeline

Turns an x.com / YouTube link (or a local file) into a draft entry in
`src/data/videos.ts`, uploaded and streamed via Mux. Adapted from the old
`videoDirectory` tooling, but tailored to lowkey's typed `Video` model.

## One-time setup

```bash
brew install yt-dlp ffmpeg          # download + probe
cp .env.example .env.local          # add MUX_TOKEN_ID / MUX_TOKEN_SECRET
```

Mux tokens: https://dashboard.mux.com/settings/access-tokens (Mux Video: Read + Write).

## Usage

```bash
# Download, upload to Mux, and scaffold a draft in videos.ts
npm run ingest "https://x.com/user/status/123456789"

# Several at once (x.com, twitter.com, youtube.com all work)
npm run ingest "https://x.com/a/status/1" "https://youtu.be/abc"

# A local file you already have
npm run ingest ./Downloads/launch.mp4

# Download + draft only, skip Mux
npm run ingest "<url>" --no-upload

# Fill in playback URLs once Mux finishes encoding (repeat until nothing pending)
npm run publish
```

## How it works

1. **`ingest`** — `yt-dlp` downloads to `uploads/`, `ffprobe` reads duration +
   aspect ratio, the file is uploaded to Mux, and a fully-typed `Video` draft is
   inserted into `videos.ts` above the `INGEST_ANCHOR` line. Editorial fields
   (title, company, description, style, credits, …) are written as `TODO`
   placeholders. `videoUrl`/`thumbnailUrl` start empty.
2. **`publish`** — Mux encodes asynchronously, so the draft has no playback id
   yet. This polls Mux for each pending upload and, once `ready`, rewrites the
   empty URLs with real Mux stream/thumbnail URLs.

A draft with an empty `videoUrl` is filtered out by `findCompanyVideos` /
`findVideo`, so **it stays invisible on the site until `publish` makes it live.**
That means you can ingest a batch, then fill in the `TODO` fields at your leisure.

## State & dedup

- In-flight Mux uploads are tracked in `scripts/.ingest-state.json` (gitignored).
  The runtime `Video` type never carries upload-id/status fields.
- Re-ingesting the same source URL (already in `videos.ts`) or the same file
  bytes (already pending) is skipped.
- Source files are moved to `uploads/processed/` on success, `uploads/failed/`
  on error. `uploads/` is gitignored.

## After ingesting

Search `videos.ts` for `TODO:` and fill in the editorial fields for each new
entry — `title`, `company`, `companyLogoUrl`, `description`, `credits`, and a
tidy `slug` / `companySlug`.

# Enrichment pipeline

Derives per-video data (transcript, pacing, audio profile, palette) and stages
montage sheets for a model pass (style tags, launch type, on-screen text,
visual summary). Same philosophy as `chapterize.mjs`: the script is
dependency-free and calls no model.

```bash
npm run enrich -- all            # extract every video (resumable; skips done)
npm run enrich -- missing        # only videos without an extract.json
npm run enrich -- 8 49 --force   # specific ids, re-extract
npm run enrich:merge             # fold results into src/data/*.json
```

1. **`enrich`** — per video: downloads the Mux `.m3u8` once, runs Whisper
   (timestamped transcript, hallucination-filtered), ffmpeg scene detection
   (cuts, cuts/min, avg shot length), an audio profile (speech share, language,
   music heuristic via non-speech-gap energy), Pillow palette + light/dark, and
   2fps montage contact sheets. Everything lands in `uploads/enrich/<id>/`.
2. **Model pass** — a subagent reads each video's `montage_*.jpg` +
   `transcript.txt` + its `videos.ts` entry and writes `analysis.json`
   (`launchType`, `styleTags`, `visualSummary`, `onScreenText`) next to
   `extract.json`. Vocabularies live in `src/types/enrichment.ts`.
3. **`enrich:merge`** — validates and folds everything into
   `src/data/enrichment.json` + `src/data/transcripts.json` (committed).
   Accessors: `src/lib/enrichment.ts`; beat stats: `src/lib/beats.ts`;
   engagement rates: `src/lib/metrics.ts`.
