/**
 * Page scroll lock, shared by everything that opens over the grid.
 *
 * Desktop locks with `overflow: hidden` on the root, which disables scrolling
 * WITHOUT touching the scroll offset. That matters: the previous approach
 * pinned `body` with `position: fixed` at a negative top and restored with
 * scrollTo on unlock — two separate writes the renderer can paint between, so
 * on close the page flashed up to the top and then snapped back down to the
 * real position (visible on any video you had to scroll to reach; invisible
 * at scrollY 0 where the pin was a no-op).
 *
 * Touch devices keep the `position: fixed` pin: `overflow: hidden` alone does
 * not stop an in-flight iOS touch scroll (its momentum keeps running on the
 * compositor), so tapping a card mid-swipe left the page drifting behind the
 * opening video. There the offset round trip is unavoidable — and invisible,
 * because the modal covers the viewport for both writes.
 *
 * Idempotent rather than ref-counted on purpose: it's engaged imperatively at
 * tap time (before React re-renders) AND by the expanded card's effect, and
 * those two must not stack into a lock nobody releases.
 */

let locked = false
let pinned = false
let scrollY = 0
let previous: { position: string; top: string; left: string; right: string; width: string; overflow: string; paddingRight: string } | null = null
let prevRootOverflow = ''

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
  prevRootOverflow = document.documentElement.style.overflow
  // Desktop scrollbar disappears with the lock — pad for it so the layout
  // doesn't jump sideways as the modal opens.
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  pinned = navigator.maxTouchPoints > 0
  if (pinned) {
    body.style.position = 'fixed'
    body.style.top = `${-scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
  } else {
    document.documentElement.style.overflow = 'hidden'
  }
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
  document.documentElement.style.overflow = prevRootOverflow
  previous = null
  locked = false
  // Only the pinned (touch) path zeroed the real offset and owes a restore.
  if (pinned) window.scrollTo(0, scrollY)
}
