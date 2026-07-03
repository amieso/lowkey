# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lowkey is a curated video platform for product launch videos ("Mobbin for launch videos"). Built with Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS, and Framer Motion. Deployed on Vercel.

## Commands

```bash
npm run dev          # Dev server with Turbopack (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

No test framework is configured.

## Adding a Video

End-to-end flow for turning a source URL (x.com / YouTube / local file) into a live, deep-linkable video. The pipeline scripts do the heavy lifting; the manual part is writing good editorial metadata.

**Prerequisites:** `yt-dlp` and `ffprobe` on PATH (`brew install yt-dlp ffmpeg`). Mux creds (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`) must be in `.env` or `.env.local` — the scripts load both from the working dir. These are gitignored, so on any non-Vercel machine (e.g. a server checkout) they must be provisioned manually; without them, drafts get created with empty playback URLs. For login-gated x.com videos, set `TWITTER_COOKIES_FILE` to a Netscape-format cookies export.

1. **Ingest** — `npm run ingest "<source-url>"` (accepts multiple URLs or a local `./file.mp4`). Downloads via yt-dlp, probes duration/aspect ratio via ffprobe, uploads to Mux, and inserts a draft `Video` into `src/data/videos.ts` above the `// INGEST_ANCHOR` line with `TODO:` placeholders and empty `videoUrl`/`thumbnailUrl`. Dedupes on `sourceUrl` + file checksum, so re-running is safe. In-flight uploads tracked in `scripts/.ingest-state.json` (gitignored).
2. **Publish** — `npm run publish`. Polls Mux; once an asset is `ready` it fills `videoUrl` (`https://stream.mux.com/{playbackId}.m3u8`) and `thumbnailUrl` (`.../thumbnail.webp?time=5`). Mux encoding is async — **re-run until it reports `0 still pending`**.
3. **Editorial metadata** — replace the `TODO:` placeholders in the new `videos.ts` entry. Get real details via `yt-dlp --skip-download --dump-json "<url>"` and/or `WebFetch` the source/company site. Match nearby entries:
   - **`slug`** — concise, describes the *video* not the company (company is already in the URL). Fix the auto-slug which often repeats the company name: prefer `framer/3-0`, `openai/atlas`, not `framer/framer-introducing-framer`. Must be globally unique as `companySlug/slug` (build-time guard enforces this).
   - **`title`** — clean display title (`Framer 3.0`), strip "Company - Introducing…" boilerplate.
   - **`company`** / **`companySlug`** — display name + stable lowercase URL key.
   - **`companyLogoUrl`** — logo.dev: `https://img.logo.dev/{domain}?token=pk_S2abCJUVRued_UW_go8tKA&format=png&theme=dark` (reuse token from other entries).
   - **`description`** — 1–2 sentence neutral editorial summary in Lowkey's voice (em dashes welcome); avoid raw marketing copy.
   - **`websiteUrl`**, **`twitterUrl`** — optional links.
   - **`credits`** — ≥1 entry. `role` is `'In-house'` (company made it), `'Agency'`, or `'Creator'`. Include `name`, `handle`, `url`, `bio`, `contactUrl`, `imageUrl`, `twitterHandle` — see nearby entries for shape.
   - **`featured`** — leave `false` unless it should hit the homepage hero. **`publishedDate`** — keep ingest-derived (source upload date). **`duration`** / **`aspectRatio`** — already correct from ffprobe; don't touch.
   - Chapters are optional, live in `src/data/chapters.ts` keyed by video `id`; only add if asked.
4. **Verify** — `npm run build` runs `generateStaticParams` for `/[company]/[slug]` plus the slug-uniqueness guard, so a clean build confirms the route renders. Video is live at `/{companySlug}/{slug}`.
5. **Commit** — the source file moves to `uploads/processed/` (gitignored); the committed change is just `src/data/videos.ts` (+ `chapters.ts` if edited). Commit as `Add {Company} {Title} video` and push to `main`.

## Architecture

### Routing & Pages
- **Next.js App Router** (`src/app/`) — server components by default, `'use client'` for interactive ones
- `/` — home page with hero (newsletter signup), video grid
- `/company/[slug]` — dynamic company profile pages
- `/api/subscribe` — POST endpoint for Resend newsletter signup (Zod validation)
- `/api/unsubscribe` — GET endpoint for list management
- `/components` — design system showcase page

### Key Architectural Patterns

**Video Player System** (`src/components/video/modal/`):
- HLS.js streaming with adaptive bitrate, quality selector, speed controls (0.5x–2x)
- `VideoPlayerHandle` ref interface exposes quality/play methods to parent `VideoModal`
- Segmented seek bar with chapter markers (`src/data/chapters.ts`)
- Custom SVG icons in `src/components/ui/player-icons.tsx` (not Lucide)
- iOS fullscreen via `webkitEnterFullscreen` API

**Card-to-Modal Animation**:
- Framer Motion `layoutId` for shared layout morphing between video cards and modal
- `AnimatePresence` with `mode="wait"` for mount/unmount transitions
- Custom easing: `[0.23, 1, 0.32, 1]`

**Intro Animation** (`src/components/intro/`):
- Context-based phase tracking via `IntroContext`: tracing → holding → settling → done
- `useFirstVisit` hook uses sessionStorage to play intro once per session
- Logo animates from center to header position during settling phase
- Children mount at `contentReady` to allow header logo animation

**Data Layer**:
- Static mock data in `src/data/videos.ts` and `src/data/chapters.ts` (no database)
- Type definitions in `src/types/video.ts` with enums for VideoStyle, ProductType, Industry, etc.

**Email/Newsletter** (`src/emails/welcome.tsx`):
- Resend SDK for contact management and transactional email
- React Email components for templates
- Logo served as direct URL from `${NEXT_PUBLIC_SITE_URL}/logo-black.png`

### Path Alias
`@/*` maps to `./src/*`

### Styling
- Tailwind CSS with CSS custom properties for theming (dark theme, RGB values for opacity support)
- Three fonts: Inter (body), Kanit (headings), JetBrains Mono (code) — loaded in `src/app/layout.tsx`
- `cn()` utility in `src/lib/utils.ts` combines clsx + tailwind-merge

### Environment Variables
```
RESEND_API_KEY
RESEND_FROM_EMAIL       # must use a verified domain; onboarding@resend.dev only reaches the account owner
NEXT_PUBLIC_SITE_URL
```

### Security Headers (next.config.ts)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (excludes image paths)
- `Referrer-Policy: strict-origin-when-cross-origin`
- Restricted `images.remotePatterns` for img.logo.dev, image.mux.com, stream.mux.com, unavatar.io
