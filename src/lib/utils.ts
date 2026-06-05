import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Video } from '@/types/video'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Canonical path for a video. The single place URLs are built, so links can't
// drift from the route. Keyed off stored slugs — never derived from display names.
export function videoPath(video: Pick<Video, 'companySlug' | 'slug'>): string {
  return `/${video.companySlug}/${video.slug}`
}

// Turns a company slug back into a display name for pages we don't have data
// for (e.g. the request page). Display-only — never used as a key.
export function unslugifyCompany(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}
