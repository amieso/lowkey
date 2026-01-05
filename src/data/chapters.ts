import { Chapter } from '@/types/video'

// Mock chapter data for existing videos
// This can be swapped to an API call later
const videoChapters: Record<string, Chapter[]> = {
  '1': [ // Lovable Launch (92s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Problem', startTime: 12 },
    { id: 'c3', title: 'Solution', startTime: 28 },
    { id: 'c4', title: 'In Action', startTime: 55 },
    { id: 'c5', title: 'CTA', startTime: 78 },
  ],
  '2': [ // Lightfield (187s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Problem', startTime: 25 },
    { id: 'c3', title: 'Solution', startTime: 70 },
    { id: 'c4', title: 'In Action', startTime: 120 },
    { id: 'c5', title: 'CTA', startTime: 165 },
  ],
  '3': [ // ChatGPT Atlas (98s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 15 },
    { id: 'c3', title: 'In Action', startTime: 40 },
    { id: 'c4', title: 'CTA', startTime: 80 },
  ],
  '4': [ // Cluely (99s)
    { id: 'c1', title: 'Problem', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 18 },
    { id: 'c3', title: 'In Action', startTime: 45 },
    { id: 'c4', title: 'CTA', startTime: 82 },
  ],
  '5': [ // Dia Arc (78s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 12 },
    { id: 'c3', title: 'In Action', startTime: 35 },
    { id: 'c4', title: 'CTA', startTime: 62 },
  ],
  '6': [ // Bump (51s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 15 },
    { id: 'c3', title: 'CTA', startTime: 38 },
  ],
  '7': [ // Ray Bloom (59s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 18 },
    { id: 'c3', title: 'CTA', startTime: 45 },
  ],
  '8': [ // ElevenLabs (48s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'In Action', startTime: 12 },
    { id: 'c3', title: 'CTA', startTime: 32 },
  ],
  '9': [ // Human Interface (211s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Problem', startTime: 30 },
    { id: 'c3', title: 'Solution', startTime: 75 },
    { id: 'c4', title: 'In Action', startTime: 140 },
    { id: 'c5', title: 'CTA', startTime: 185 },
  ],
  '10': [ // $3M Funding (85s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 20 },
    { id: 'c3', title: 'In Action', startTime: 55 },
    { id: 'c4', title: 'CTA', startTime: 72 },
  ],
  '11': [ // Furqan VC World (90s)
    { id: 'c1', title: 'Problem', startTime: 0 },
    { id: 'c2', title: 'Solution', startTime: 25 },
    { id: 'c3', title: 'In Action', startTime: 55 },
    { id: 'c4', title: 'CTA', startTime: 78 },
  ],
  '12': [ // Amie (54s)
    { id: 'c1', title: 'Hook', startTime: 0 },
    { id: 'c2', title: 'In Action', startTime: 15 },
    { id: 'c3', title: 'In Action', startTime: 32 },
    { id: 'c4', title: 'CTA', startTime: 45 },
  ],
}

export function getChaptersForVideo(videoId: string): Chapter[] {
  return videoChapters[videoId] || []
}
