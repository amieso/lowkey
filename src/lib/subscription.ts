// Local "this browser already subscribed" flag, set on any successful signup
// (hero or player capture). Lets the player's email pill stay away from people
// who are already on the list. Best-effort: storage can be unavailable
// (private mode, blocked), and that must never break the form itself.
const SUBSCRIBED_KEY = 'lowkey_subscribed'

export function markSubscribed(): void {
  try {
    window.localStorage.setItem(SUBSCRIBED_KEY, '1')
  } catch {
    // Storage unavailable — the signup still succeeded server-side.
  }
}

export function hasSubscribed(): boolean {
  try {
    return window.localStorage.getItem(SUBSCRIBED_KEY) !== null
  } catch {
    return false
  }
}
