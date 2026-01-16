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
