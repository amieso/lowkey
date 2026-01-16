# Lowkey Notes

## Release Streamline (Jan 2026)

**What was removed:**
- Auth system (Supabase auth, login/signup, saved collections)
- Filter sidebar and control bar
- Directory pages (/companies, /creators, /saved, /collections)
- Video modal sidebar (info pane, breakdown mode)
- Submit page (use email instead)

**What remains:**
- Home page with hero + newsletter + all videos (no gating)
- Video modal with just the player (full width, no sidebar)
- Company pages (/company/[slug])
- Header: Logo | Submit (mailto) | About
- Footer with legal links

**Routes:**
- `/` - Home with all videos
- `/company/[slug]` - Company profile
- `/privacy`, `/terms` - Legal pages
- `/about` - About page (needs creation or link to external)

---

## Video Player - Poster/Black Screen Fix (Jan 2026)

**Problem:** Videos showed a mid-clip still (poster frame) before playback started, causing visual flashes. Black screens also appeared in some cases.

**Solution:**
- Removed all `poster` props from:
  - Modal player
  - `/video/[slug]` player
  - Hover card videos
- Added `preload="auto"` to video elements so first frame buffers immediately

**Why this works:** The poster was being extracted mid-clip rather than at frame 0. By removing the poster and using `preload="auto"`, the browser loads and displays the actual first frame of the video, avoiding both black screens and poster flashes.

**Don't do:**
- Don't use `poster` prop on videos - it causes flash before playback
- Don't use `preload="none"` or `preload="metadata"` - causes black screen before first frame loads

---

## 2026-01-16 - Deployment
- Deployed to: https://lowkxy.vercel.app
- Changes included: Newsletter subscription with Resend (API route, welcome email template, logo hosted at /logo.png)

## 2026-01-16 - Video Modal Title Bar
- Added title bar above video player with company/title + Visit button
- Staggered animations: company (delay 0.15), title (delay 0.18), button (delay 0.15)
- Animation uses ease [0.23, 1, 0.32, 1] for smooth feel
- Button uses subtle y: -2 movement, text uses y: -10
- Modal max-width reduced from 1600px to 1254px

## 2026-01-16 - Card→Modal Morph Animation
- Uses Framer Motion shared layout animation via `layoutId`
- Both VideoCard and VideoModal player containers share `layoutId={video-${video.id}}`
- Transition: duration 0.25s, ease [0.4, 0, 0.2, 1]
- AnimatePresence with mode="wait" wraps the modal in video-grid.tsx
- Additional animations (not part of morph):
  - Backdrop fades in (duration 0.2s)
  - Title bar elements slide down with staggered delays (0.15s, 0.18s)
  - Exit animations are fast (0.1s) with upward movement to avoid ghosting
- No close button - dismiss via backdrop click or Escape key

## 2026-01-16 - Hero Subscribe Input Redesign
- Placeholder: "Enter your email" (center-aligned)
- Submit button: 32px round white button with arrow, 4px inset from input edge
- Button appears with fade when email text is entered
- Success state: Same input field shrinks from 288px → 156px (300ms cubic-bezier)
- Input text fades out (150ms), "You're subscribed!" fades in after 200ms delay
- Single container morphs - no separate elements swapping

## 2026-01-16 - Deployment
- Deployed to: https://lowkxy.vercel.app
- Changes included: Video modal now plays with sound on by default (added startMuted prop to VideoPlayer)

## 2026-01-16 - Theme Toggle (Dark/Light Mode)
Added theme switching with dark as default and oatmeal light mode as option.

**Implementation:**
- CSS variables in `globals.css` define both themes (`:root` for dark, `:root.light` for light)
- Tailwind colors reference CSS vars: `background: 'var(--background)'`
- `ThemeToggle` component in header (self-contained, no context needed)
- Theme persisted to localStorage, applies `.light` class to `<html>`

**Dark theme (default):**
- `--background: #0a0a0a` (near black)
- `--surface: #171717` (dark grey)
- `--foreground: #fafafa` (off-white)
- `--muted: #a3a3a3` (medium grey)

**Light theme (oatmeal, Cursor-inspired):**
- `--background: #f5f3ef` (warm cream)
- `--surface: #eae7e1` (slightly darker cream)
- `--foreground: #1a1815` (warm near-black)
- `--muted: #6b6660` (warm medium grey)

**Design decisions:**
- Video player controls stay dark-themed (white text on dark overlay) for contrast over video
- Video card hover overlay stays dark (`bg-black`) for readability
- Modal backdrop uses `bg-background/90` so it adapts to theme

## 2026-01-16 - Branding Assets & Favicon

**Logomark:** Eye/lens symbol (circle + eye shape + pupil) representing "curated view"

**Favicon setup:**
- `/src/app/icon.svg` - Theme-adaptive (uses CSS `prefers-color-scheme`)
  - Dark browser theme → white strokes
  - Light browser theme → black strokes
- `/src/app/icon.png` - Black PNG fallback for Safari (doesn't support SVG favicons)
- Safari ignores SVG favicons entirely, so PNG is required

**OG Image:**
- `/public/animated-og.gif` - Animated eye logo on black background
- GIF format works for animated previews on Discord/Slack
- Twitter, Facebook, LinkedIn, iMessage do NOT animate GIFs in link previews (first frame only)

**Logo files in /public:**
- `logomark.svg` - White eye mark (for dark backgrounds)
- `logomark-dark.svg` - Black eye mark (for light backgrounds)
- `logo.svg` - "lowkey" wordmark
- `favicon-white.png`, `favicon-black.png` - PNG versions

**Header logo:** Icon + 8px gap + wordmark, uses `currentColor` to adapt to theme

## 2026-01-16 - Animated Logo on Hover

Added eye animation to the header logo that triggers on hover over the entire logo lockup (icon + wordmark).

**Implementation:**
- Component: `src/components/ui/animated-logo.tsx`
- Header passes `isHovered` prop from mouse enter/leave on Link wrapper
- Uses SMIL `<animate>` for path morphing (eye blink) and CSS keyframes for pupil movement

**Animation specs (matching OG image exactly):**
- Duration: 12s, loops infinitely while hovering
- Pupil movement: translateX(3.6px) right → center → left → center pattern
- Eye blink: Path morphs at keyTimes 0.58→0.60→0.62 (quick blink near end of cycle)
- Easing: `0.4 0 0.2 1` spline for smooth motion

**Key learnings:**
- Use `useId()` to generate unique IDs for clipPath and keyframes to avoid conflicts
- SMIL animate elements need to be conditionally rendered (not just toggled) to restart animation

## 2026-01-16 - Emoji Confetti Animation

Added emoji explosion animation when users successfully subscribe to the newsletter.

**Implementation:**
- Component: `src/components/ui/emoji-confetti.tsx`
- Triggers when `status === 'success'` in hero-section
- Uses Framer Motion with per-property transitions for smooth animation

**Animation details:**
- 7 emojis: ♟️ ☑️ 💫 🙌 💪 ✨ 🚀
- X uses spring physics (stiffness: 100, damping: 20) for smooth horizontal burst
- Y uses keyframe animation with hold at peak before floating up
- Opacity fades out at 70% of animation (before reaching top)
- Stagger delay: 0.08s between emojis
- Total duration: 3s

**Key learnings:**
- Single easing for all keyframes causes jitter at transition points
- Per-property transitions with different easing curves = smoother animation
- Spring physics on X eliminates horizontal jitter
- Cubic bezier values > 1 cause overshoot/bounce (can cause jitter if not desired)
