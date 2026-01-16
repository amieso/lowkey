# Lowkey Progress

## Completed
- [x] Fix video player poster/black screen flash issue
  - Removed poster props from modal, video page, and hover cards
  - Added preload="auto" for immediate first-frame buffering

## In Progress
(none)

## Just Completed
- [x] Redesign hero subscribe input
  - Center-aligned placeholder "Enter your email"
  - Inline 32px round submit button with arrow (4px inset)
  - Button fades in when email entered
  - Success state: field shrinks with smooth animation, text morphs to "You're subscribed!"

## Recently Completed
- [x] Add card-to-modal morph animation
  - Shared `layoutId={video-${video.id}}` between VideoCard and VideoModal
  - Transition: 0.25s with ease [0.4, 0, 0.2, 1]
  - Backdrop fades in (0.2s)
  - Title bar has staggered enter animations + fast exit (0.1s fade up)
  - Removed close button (backdrop click or Escape to dismiss)

## Recently Completed
- [x] Add title bar above video player in modal
  - Company name (uppercase mono) + title (h2) on left
  - Conditional "Visit" button on right when websiteUrl exists
  - Staggered fade-in animations on all elements
  - Modal size reduced to max-w-[1254px]

## Backlog
(none)

## Recently Completed
- [x] Release streamline - removed auth, gating, filters, directories
  - Deleted: auth system, filter components, directory pages, modal sidebar
  - Simplified: header (Logo|Submit|About), hero (newsletter form), video grid (no gating)
  - Routes now: /, /company/[slug], /privacy, /terms, /about (needs creation)
