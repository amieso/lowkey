// Derived per-video data produced by scripts/enrich.mjs (mechanical extraction)
// plus a model pass over the montage sheets (style, launch type, on-screen
// text). Merged into src/data/enrichment.json / transcripts.json by
// scripts/enrich-merge.mjs.

export type LaunchType =
  | 'product-launch' // new product or company debut
  | 'feature-release' // update to an existing product
  | 'model-release' // AI model announcement
  | 'funding' // raise / milestone announcement
  | 'rebrand' // new identity / brand system
  | 'other'

export type StyleTag =
  | 'screen-recording' // real product UI captured
  | 'product-ui' // designed/mocked UI shots
  | 'motion-graphics'
  | '3d-render'
  | 'live-action'
  | 'talking-head' // founder/person speaking to camera
  | 'kinetic-typography'
  | 'animation' // 2d/character animation
  | 'cinematic' // filmic footage, shallow DOF, graded
  | 'mixed-media'

export interface OnScreenText {
  time: number // seconds
  text: string
}

export interface PacingProfile {
  cuts: number
  cutsPerMinute: number
  avgShotSeconds: number
}

export interface AudioProfile {
  hasAudio: boolean
  hasSpeech: boolean
  speechShare: number // 0..1 fraction of runtime with speech
  language: string | null
  hasMusic: boolean // heuristic: audio energy in non-speech gaps
}

export interface VideoEnrichment {
  // model pass — null/empty until analyzed
  launchType: LaunchType | null
  styleTags: StyleTag[]
  visualSummary: string | null // 1–2 sentences on what the video looks like
  onScreenText: OnScreenText[] // prominent text shown on screen
  // mechanical extraction
  pacing: PacingProfile
  audio: AudioProfile
  palette: string[] // dominant colors, hex, most frequent first
  lightDark: 'light' | 'dark' | 'mixed'
}

export interface TranscriptSegment {
  start: number // seconds
  end: number
  text: string
}

export interface VideoTranscript {
  language: string | null
  segments: TranscriptSegment[]
}
