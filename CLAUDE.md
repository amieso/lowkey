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
RESEND_AUDIENCE_ID
RESEND_FROM_EMAIL
NEXT_PUBLIC_SITE_URL
```

### Security Headers (next.config.ts)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (excludes image paths)
- `Referrer-Policy: strict-origin-when-cross-origin`
- Restricted `images.remotePatterns` for img.logo.dev, image.mux.com, stream.mux.com, unavatar.io
