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

// Central registry of goal names so call sites can't drift or typo. DataFast
// auto-creates goals on first sighting, so the names here are the contract.
export const GOALS = {
  videoOpen: 'video_open',
  videoPlay: 'video_play',
  videoComplete: 'video_complete',
  videoWatchTime: 'video_watch_time',
  newsletterSignup: 'newsletter_signup',
  outboundVisit: 'outbound_visit',
  outboundPost: 'outbound_post',
  companyPageView: 'company_page_view',
  arrowNavigation: 'arrow_navigation',
  introCompleted: 'intro_completed',
  partnerCtaClick: 'partner_cta_click',
  partnerOpen: 'partner_open',
} as const

export type GoalName = (typeof GOALS)[keyof typeof GOALS]

/** Fire a DataFast goal. No-ops when the client isn't available. */
export function trackGoal(goal: GoalName, metadata?: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    window.datafast?.(goal, metadata)
  } catch {
    // Analytics must never break the app.
  }
}

/**
 * Fire a goal that may be triggered before the DataFast script has finished
 * loading (e.g. on a fresh deep-link landing, where the analytics client is
 * injected with strategy="afterInteractive"). Retries briefly until the global
 * is present, then gives up so a blocked/absent client never spins forever.
 */
export function trackGoalWhenReady(
  goal: GoalName,
  metadata?: Record<string, string>,
  { retries = 20, intervalMs = 250 }: { retries?: number; intervalMs?: number } = {},
): void {
  if (typeof window === 'undefined') return
  if (typeof window.datafast === 'function') {
    trackGoal(goal, metadata)
    return
  }
  if (retries <= 0) return
  window.setTimeout(
    () => trackGoalWhenReady(goal, metadata, { retries: retries - 1, intervalMs }),
    intervalMs,
  )
}
