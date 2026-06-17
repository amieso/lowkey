// Thin wrapper around the DataFast analytics client (loaded in
// src/app/layout.tsx via next/script). Safe to call anywhere: if the script
// isn't present (local dev, env var unset, not yet loaded) the calls no-op
// instead of throwing.
//
// DataFast exposes a global `datafast(goalName, metadata?)`. Goal names must be
// lowercase and may use underscores; metadata values are strings, max ~255
// chars, up to a handful of keys per event.

type DataFastFn = (goal: string, metadata?: Record<string, string>) => void

declare global {
  interface Window {
    datafast?: DataFastFn
  }
}

/** Fire a DataFast goal. No-ops when the client isn't available. */
export function trackGoal(goal: string, metadata?: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    window.datafast?.(goal, metadata)
  } catch {
    // Analytics must never break the app.
  }
}
