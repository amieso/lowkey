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

## 2026-01-16 - Custom Player Icons

Replaced Lucide icons with custom SVG icons for the video player controls.

**Icons created:**
- `src/components/ui/player-icons.tsx` - React components for all icons
- `src/icons/` - Source SVG files (9 icons)

**Icons included:**
- PlayIcon, PauseIcon - playback controls
- SkipForwardIcon, SkipBackwardIcon - 5-second skip with "5" built into icon
- SoundFullIcon, SoundMidIcon, SoundOffIcon - volume states
- ExpandIcon, MinimizeIcon - fullscreen toggle

**Button standardization:**
- All player control buttons now use `w-8 h-8` (32x32px) containers
- Consistent hit targets across play/pause, skip, volume, fullscreen buttons
- Icons use `currentColor` for easy theming via `text-white` class

**Files updated:**
- `player-controls.tsx` - Play/Pause button
- `skip-button.tsx` - Skip forward/backward (removed overlaid "5" text span)
- `volume-slider.tsx` - Volume button
- `fullscreen-button.tsx` - Expand/Minimize button
- `hero-overlay.tsx` - Hero play and mute buttons
- `video-modal.tsx` - Center play/pause feedback overlay

## 2026-01-17 - Intro Animation (WIP)

Added intro animation sequence that plays on first visit. Logo traces in center, blinks, then transitions to header.

**Current implementation:**
- `IntroAnimation` component shows centered `IntroLogo` (160px) with stroke trace animation
- After trace + blink, header mounts and `AnimatedLogo` (44px) animates from center position
- Two separate DOM elements crossfade during "settling" phase

**Known issue - handoff blip:**
The transition from IntroLogo → AnimatedLogo creates a visible jump because:
1. Two separate DOM nodes - crossfade doesn't perfectly align
2. Stroke-width mismatch - scaling 160px→44px makes IntroLogo strokes thinner, AnimatedLogo has full weight at 44px
3. Position calculation is approximate (`window.innerHeight / 2 - 52`)

**Failed fix attempt (reverted):**
- Tried creating single `LogoSprite` + `LogoConductor` components
- Issues: logo didn't appear in center, wrong stroke weight, wrong settle position
- Reverted with git checkout (should have used /rewind)

**What would fix it (from Codex analysis):**
- Single DOM element throughout entire animation (no handoff)
- `vectorEffect="non-scaling-stroke"` on SVG paths to keep stroke width constant when scaled
- `getBoundingClientRect()` to measure exact header position instead of calculating
- Position mode flip: animate with `position: fixed`, then switch to `position: relative` in `onAnimationComplete`

## 2026-01-17 - Footer Experiments (Abandoned)

Tried several footer designs, all reverted:

1. **Large wordmark with animated eye** - "lowkey" text edge-to-edge with eye logo replacing "o"
   - Issue: Didn't look good, affected navbar logo somehow

2. **Scroll-driven eye logo** - Ghost logo that grows 120px→320px and traces in as you scroll
   - Issue: Animation didn't feel right

3. **Ticker marquee** - Logo + wordmark repeated, scrolling horizontally
   - Issue: Didn't look good

4. **Text ticker** - "YOU HAVE REACHED THE FOOTER · LOWKEY™" scrolling
   - Issue: Too much, not needed

**Decision:** Keep simple footer with just links and copyright. Don't over-engineer it.

## 2026-01-17 - Mobile View Implementation

Comprehensive mobile responsiveness pass. Base device: iPhone 14 (390px width).

**Approach:**
- Mobile-first: base styles for mobile, `sm:` / `md:` prefixes for larger screens
- Breakpoints used: `sm: 640px`, `md: 768px`
- No custom breakpoints - stick to Tailwind defaults

**Key patterns:**

1. **Full-width inputs on mobile:**
   ```tsx
   className="w-full md:w-[288px]"  // Full on mobile, fixed on desktop
   ```

2. **Stacking layouts:**
   ```tsx
   className="flex flex-col sm:flex-row"  // Stack on mobile, row on desktop
   ```

3. **Conditional rendering by breakpoint:**
   ```tsx
   // Mobile-only element
   className="sm:hidden"
   // Desktop-only element
   className="hidden sm:inline-flex"
   ```

4. **Hover states on touch devices:**
   - Hide hover overlays on mobile (`hidden md:flex`) since touch has no hover
   - Don't rely on hover for essential functionality

5. **Scaling sizes:**
   ```tsx
   className="text-lg md:text-2xl"  // Smaller on mobile
   className="w-16 h-16 sm:w-20 sm:h-20"  // Scale icons
   ```

**Files modified:**
- `hero-section.tsx` - Input width, text sizes, spacing
- `video-card.tsx` - Hide hover overlay on mobile
- `video-modal.tsx` - Stack title bar, dual Visit buttons (mobile below video, desktop in header)
- `header.tsx` - Reduce top padding
- `footer.tsx` - Stack links vertically
- `video-grid.tsx` - Tighter gap

**Design decision - Visit button:**
Created two separate Visit button elements rather than repositioning one:
- Desktop: `hidden sm:inline-flex` in title bar (row layout)
- Mobile: `sm:hidden mt-6 w-full` below video (full-width, 24px margin)
This avoids complex positioning logic and keeps each layout clean.

## 2026-01-17 - Mobile Player Controls

**Hidden on mobile (< 640px / sm breakpoint):**
- Skip buttons (±5s) - touch devices use scrubbing instead
- Speed selector (1x) - rarely used on mobile, saves space

**iOS Safari fullscreen:**
- iOS doesn't support `requestFullscreen` on containers, only on video elements
- Added `webkitEnterFullscreen` / `webkitSupportsFullscreen` check
- Falls back to container fullscreen on desktop browsers

## 2026-01-17 - Logo Animation Fix

**Problem:** Logo was static on returning visits (when intro is skipped)

**Root cause:** `introComplete` stayed `false` when no intro was shown, so `AnimatedLogo` didn't animate.

**Fix:** In `home-page-wrapper.tsx`, added useEffect to set `introComplete(true)` when intro is not needed:
```tsx
if (!isLoading && !showIntroFromHook && !introStarted) {
  setIntroComplete(true)
}
```

## 2026-01-17 - Pull-to-Refresh

Removed `overscroll-behavior: none` from globals.css to enable native pull-to-refresh on mobile Safari/Chrome.
