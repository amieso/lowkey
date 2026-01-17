# Lowkey Progress

## Completed
- [x] Fix video player poster/black screen flash issue
- [x] Redesign hero subscribe input
- [x] Add card-to-modal morph animation
- [x] Add title bar above video player in modal
- [x] Release streamline - removed auth, gating, filters, directories
- [x] Add branding assets (logomark, favicon, OG image)
  - Eye/lens logomark added to header (icon + wordmark)
  - Theme-adaptive SVG favicon (white/black based on browser theme)
  - PNG fallback for Safari
  - Animated GIF OG image for social sharing
- [x] Add emoji confetti animation on subscribe success
- [x] Fix video player play/pause button not working (pointer-events on blur overlays)
- [x] Add hero copy update with subscribe CTA
- [x] Add subscribe input reset after 4 seconds
- [x] Add animated logo on hover (eye looks around + blinks, 12s loop)
- [x] Replace Lucide icons with custom player icons
  - Custom SVG icons for play, pause, skip, volume, expand, minimize
  - Standardized all player control buttons to 32x32px containers
  - Updated video modal center play/pause overlay
- [x] Create /components design system page
- [x] Add IntroLogo loop prop for continuous trace animation (5s cycle)
- [x] Mobile view improvements (comprehensive)
  - Hero section: full-width input, scaled text, adjusted spacing
  - Video card: hidden hover overlay on touch devices
  - Video modal: stacked title bar, dual Visit buttons
  - Header/footer: responsive padding and stacking
  - Video grid: tighter gaps on mobile
- [x] Mobile player refinements
  - Hide skip buttons (±5s) on mobile
  - Hide speed selector (1x) on mobile
  - Add iOS Safari fullscreen support (webkitEnterFullscreen)
- [x] Fix logo animation on returning visits
  - Set introComplete=true when intro is skipped so logo animates
- [x] Enable pull-to-refresh on mobile (removed overscroll-behavior: none)
- [x] Fix iOS input zoom on mobile
  - Added viewport meta with maximumScale=1, userScalable=false
  - Changed hero input from text-sm to text-base (16px prevents iOS auto-zoom)
- [x] Disable vertical rubber-banding while keeping swipe navigation
  - Added overscroll-behavior-y: none to html and body
  - Added -webkit-overflow-scrolling: auto
- [x] Improve subscribe error messages
  - "Invalid email" for client validation, "Email not supported" for server errors
  - Error text absolutely positioned 16px below input
- [x] Tablet grid layout - 2 columns on iPad mini/tablets (lg breakpoint instead of md)

## In Progress
- [ ] Fix intro logo handoff animation (logo jumps during settling phase)
- [ ] Investigate intro logo trace animation on mobile (user reports it's "messed up")

## Recently Completed (Email Logo Fix - Jan 2026)
- [x] Fixed welcome email logo not displaying
  - Issue was Resend's `onboarding@resend.dev` sender can only send to account owner
  - Purchased domain on IONOS and verified with Resend (DKIM, SPF, DMARC records)
  - Set up `RESEND_FROM_EMAIL` env var with verified domain
  - Logo now uses direct URL from `NEXT_PUBLIC_SITE_URL`
  - Softened logo appearance (32px, 60% opacity)

## Recently Completed (Security Audit - Jan 2026)
- [x] Fixed XSS vulnerability in company page (innerHTML → textContent)
- [x] Restricted image domains in next.config.ts (was allowing **)
- [x] Added security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- [x] Improved email validation with Zod (was just checking for @)
- [x] Removed test email handler from production code
- [x] Removed console.logs leaking email addresses in server logs

## Recently Completed (Codebase Cleanup - Jan 2026)
- [x] Deleted unused public assets (logo.svg, logo.png, logo-dark.svg, logomark.svg, logomark-dark.svg, favicon-black.png, favicon-white.png, og-image.svg, og-image.png)
- [x] Deleted src/icons/ folder (source SVGs now in React components)
- [x] Deleted unused UI components (input.tsx, modal.tsx)
- [x] Removed unused npm dependencies (@supabase/ssr, @supabase/supabase-js, react-use-measure)
- [x] Cleaned up dead code in video.ts (removed unused types, interfaces, constants)
- [x] Removed unused props from VideoModal (allVideos, onVideoChange)

## Backlog
(none)
