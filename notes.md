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
