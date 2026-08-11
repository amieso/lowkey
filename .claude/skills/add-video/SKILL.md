---
name: add-video
description: Add a new video to the Lowkey platform from a source URL (x.com / YouTube / local file). Downloads via yt-dlp, uploads to Mux, scaffolds a draft entry, then fills in editorial metadata (title, company, description, credits, concise slug). Use when the user says "add this video", "upload to lowkey", "ingest this", or pastes an x.com/YouTube link to publish.
allowed-tools:
  - Bash
  - Read
  - Edit
  - WebFetch
---

# Add a video to Lowkey

End-to-end flow for turning a source URL into a live, deep-linkable video on the Lowkey platform. The pipeline scripts (`scripts/ingest.mjs`, `scripts/publish-videos.mjs`, `scripts/ingest-lib.mjs`) do the heavy lifting; your job is to run them and then write good editorial metadata.

## Prerequisites (verify once)

```bash
which yt-dlp ffprobe ffmpeg whisper   # ingest/publish need yt-dlp+ffprobe; chapters need ffmpeg+whisper
grep -oE '^[A-Z_]+' .env               # expect MUX_TOKEN_ID, MUX_TOKEN_SECRET
```

Install: `brew install yt-dlp ffmpeg` and `pipx install openai-whisper`.

Scripts load `.env` and `.env.local` automatically. Mux creds come from https://dashboard.mux.com/settings/access-tokens (Mux Video: Read + Write). For login-gated x.com videos, set `TWITTER_COOKIES_FILE` in `.env.local`.

## Step 1 — Ingest

```bash
npm run ingest "<source-url>"
```

Accepts x.com/YouTube URLs, multiple URLs at once, or a local `./file.mp4`. This downloads (yt-dlp), probes duration/aspect ratio (ffprobe), uploads to Mux, and inserts a draft `Video` into `src/data/videos.ts` above the `// INGEST_ANCHOR` line with TODO placeholders and an empty `videoUrl`/`thumbnailUrl`. It dedupes on `sourceUrl` and file checksum, so re-running is safe. In-flight uploads are tracked in `scripts/.ingest-state.json` (gitignored).

Note the printed `id` and `companySlug/slug` for the new draft.

## Step 2 — Publish (fill playback URLs)

```bash
npm run publish
```

Polls Mux for each pending upload; once the asset is `ready` it rewrites `videoUrl` (`https://stream.mux.com/{playbackId}.m3u8`) and `thumbnailUrl` (`.../thumbnail.webp?time=5`) in `videos.ts` and clears it from state. Mux encoding is async — **re-run until it reports `0 still pending`** (usually seconds, occasionally minutes).

## Step 3 — Write the editorial metadata

The draft has `TODO:` placeholders. Get the real details before editing:

```bash
yt-dlp --skip-download --dump-json "<source-url>" 2>/dev/null \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("TITLE:",j.title,"\nDESC:",j.description,"\nUPLOADER:",j.uploader_id,"\nDATE:",j.upload_date)})'
```

For a richer, accurate description, also `WebFetch` the source URL or the company's site if the tweet text is thin.

Then `Edit` the entry in `src/data/videos.ts`. Match the conventions of nearby entries:

- **`slug`** — concise, describes the *video*, NOT the company (the company is already in the URL). The ingest auto-slug often repeats the company name; fix it. E.g. `framer/3-0`, `lovable/launch`, `openai/atlas`, `cluely/demo` — not `framer/framer-introducing-framer`. Must be unique within the company (a build-time guard enforces `companySlug/slug` global uniqueness).
- **`title`** — clean display title, e.g. `Framer 3.0` (strip the "Company - Introducing…" boilerplate).
- **`company`** + **`companySlug`** — display name + stable lowercase URL key.
- **`companyLogoUrl`** — logo.dev: `https://img.logo.dev/{domain}?token=pk_S2abCJUVRued_UW_go8tKA&format=png&theme=dark` (reuse the token from other entries).
- **`companyFounded`** — founding year (optional but usually filled).
- **`description`** — 1–2 sentence editorial summary of what the product/launch does. Avoid raw marketing copy; write it in Lowkey's neutral, informative voice. Match the prose style of recent entries (they use em dashes freely).
- **`websiteUrl`**, **`twitterUrl`** — optional links (`https://twitter.com/{handle}`).
- **`credits`** — at minimum one entry. `role` is usually `'In-house'` (company made it) or `'Agency'` / `'Creator'` (someone else did). Include `name`, `handle`, `url`, `bio`, `contactUrl`, `imageUrl` (logo.dev or avatar), `twitterHandle`. See nearby entries for the exact shape.
- **`featured`** — leave `false` unless the user wants it on the homepage hero.
- **`publishedDate`** — keep the ingest-derived date (source upload date) unless told otherwise.
- **`duration`**, **`aspectRatio`** — already correct from ffprobe; don't touch.

Chapters live separately in `src/data/chapters.ts` — Step 4 handles them.

## Step 4 — Chapters (topical title + narrative beat)

Every video gets chapters. A script extracts the raw material; you read it and write the chapters.

The video must be published first (Step 2) — the script pulls frames and audio straight from the Mux `.m3u8`. Needs `whisper` and `ffmpeg` on PATH (`brew install ffmpeg`; `pipx install openai-whisper`).

```bash
npm run chapterize -- <id> --no-frames
```

Output lands in `uploads/chapterize/<id>/`:

- `montage_000.jpg …` — timestamped contact sheets at 4fps. The yellow `M:SS` in each cell's top-left is that frame's real time in the video.
- `transcript.txt` — Whisper transcript with `[M:SS]` timestamps. Missing or empty means a silent video; use the montages alone.
- `meta.json` — carries `hasSpeech`.

`Read` every `montage_*.jpg` in order, and the transcript. Then `Edit` a `Chapter[]` into `src/data/chapters.ts`, keyed by the video `id`. Match the shape of nearby entries.

Rules (strict):

- **Count scales with runtime** — about one chapter per 12–15s. A ~30s video gets 3, a ~45s video gets 3–4, only a 75s+ video approaches 6. Minimum 3, maximum 6.
- **`title`** — 2–4 words, TOPICAL. Name what happens in THIS video (`Dexterity Trials`, `Beating the Benchmarks`). Never generic labels (`Introduction`, `Solution`, `Demo`, `Outro`).
- **`beat`** — narrative role, one of `hook | problem | solution | in-action | proof | cta`.
- **`startTime`** — integer seconds, snapped to a real cut you can see in a montage or hear in the transcript. The first chapter is `0`. Strictly increasing. None may be ≥ the video's `duration`.
- **No chapter shorter than ~6s**, except the final CTA/outro. Fold a fleeting moment into its neighbour instead of giving it its own chapter.

Delete the scratch afterward: `rm -rf uploads/chapterize/<id>` (it's gitignored either way).

To backfill or re-do many videos at once, the same script takes `all` or `missing` and a space-separated id list; segmenting them in bulk is a job for a subagent-per-video workflow, not this inline flow.

## Step 5 — Verify

```bash
npm run build
```

The build runs `generateStaticParams` for `/[company]/[slug]` and the slug-uniqueness guard, so a clean build confirms the new route renders and there are no collisions. The video is now live at `/{companySlug}/{slug}`.

## Step 6 — Commit (only if the user asks)

The source file is moved to `uploads/processed/`. The committed change is `src/data/videos.ts` plus `src/data/chapters.ts`. `uploads/` and `scripts/.ingest-state.json` are gitignored.

```bash
git add src/data/videos.ts src/data/chapters.ts
git commit -m "Add {Company} {Title} video"
```

## Troubleshooting

- **`MUX_TOKEN_ID / MUX_TOKEN_SECRET not set`** — drafts are created with empty playback URLs. Add creds to `.env`/`.env.local`, then `npm run publish` once the upload exists, or re-ingest. `--no-upload` skips Mux entirely (draft only).
- **Download fails on a private/gated x.com video** — set `TWITTER_COOKIES_FILE` to a Netscape-format cookies export.
- **Build fails with a duplicate slug error** — two entries share `companySlug/slug`; pick a different concise slug.
- **`publish` keeps saying pending** — Mux is still encoding; wait and re-run. Failed source files land in `uploads/failed/`.
