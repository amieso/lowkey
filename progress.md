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

## In Progress
- [ ] Fix intro logo handoff animation (logo jumps during settling phase)

## Backlog
(none)
