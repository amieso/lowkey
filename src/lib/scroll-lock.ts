/**
 * Page scroll lock, shared by everything that opens over the grid.
 *
 * `body { overflow: hidden }` alone is not enough on iOS: an in-flight touch
 * scroll (and its momentum) keeps running on the compositor, so tapping a card
 * mid-swipe left the page drifting behind the opening video. Pinning the body
 * with `position: fixed` at a negative offset stops the scroll dead and holds
 * the visual position; unlocking restores the offset with scrollTo, so the
 * round trip is invisible.
 *
 * Idempotent rather than ref-counted on purpose: it's engaged imperatively at
 * tap time (before React re-renders) AND by the expanded card's effect, and
 * those two must not stack into a lock nobody releases.
 */

let locked = false
let scrollY = 0
let previous: { position: string; top: string; left: string; right: string; width: string; overflow: string; paddingRight: string } | null = null

export function lockScroll() {
  if (locked || typeof window === 'undefined') return
  const body = document.body
  scrollY = window.scrollY
  previous = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  }
  // Desktop scrollbar disappears with the lock — pad for it so the layout
  // doesn't jump sideways as the modal opens.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  body.style.position = 'fixed'
  body.style.top = `${-scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
  locked = true
}

export function unlockScroll() {
  if (!locked || !previous) return
  const body = document.body
  body.style.position = previous.position
  body.style.top = previous.top
  body.style.left = previous.left
  body.style.right = previous.right
  body.style.width = previous.width
  body.style.overflow = previous.overflow
  body.style.paddingRight = previous.paddingRight
  previous = null
  locked = false
  window.scrollTo(0, scrollY)
}
