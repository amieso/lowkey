import { Comment } from '@/types/video'

const videoComments: Record<string, Comment[]> = {
  '1': [ // Lovable
    { id: 'c1', author: 'Sarah Chen', text: 'The motion graphics in this are insane. Love how smooth the transitions are.', timestamp: '2024-12-15T10:30:00Z', likes: 24 },
    { id: 'c2', author: 'Marcus Wei', text: 'Finally a promo video that actually shows the product working. No fluff.', timestamp: '2024-12-14T15:45:00Z', likes: 18 },
    { id: 'c3', author: 'Elena Voss', text: 'The pacing is perfect. Hooks you in the first 5 seconds.', timestamp: '2024-12-13T09:20:00Z', likes: 12 },
    { id: 'c4', author: 'Jake Morrison', text: 'Who did the sound design? It\'s so clean.', timestamp: '2024-12-12T22:15:00Z', likes: 8 },
  ],
  '2': [ // Lightfield
    { id: 'c1', author: 'Alex Rivera', text: 'This is the future of spatial computing. Incredible tech.', timestamp: '2024-11-20T14:30:00Z', likes: 45 },
    { id: 'c2', author: 'Jordan Kim', text: 'The visual quality here is unmatched. What camera setup are they using?', timestamp: '2024-11-19T11:20:00Z', likes: 32 },
    { id: 'c3', author: 'Taylor Brooks', text: 'Would love to see a breakdown of how they achieved some of these shots.', timestamp: '2024-11-18T16:45:00Z', likes: 21 },
  ],
  '3': [ // ChatGPT Atlas
    { id: 'c1', author: 'Dev Patel', text: 'Been waiting for something like this. The browser + AI integration is seamless.', timestamp: '2024-12-10T08:30:00Z', likes: 56 },
    { id: 'c2', author: 'Sam Foster', text: 'Clean UI reveal. The way they showed the search feature was clever.', timestamp: '2024-12-09T19:15:00Z', likes: 38 },
    { id: 'c3', author: 'Casey Morgan', text: 'This promo actually undersells it - the product is even better IRL.', timestamp: '2024-12-08T12:00:00Z', likes: 29 },
  ],
  '4': [ // Cluely
    { id: 'c1', author: 'Rachel Green', text: 'Controversial product but you can\'t deny the video is well made.', timestamp: '2024-12-05T10:00:00Z', likes: 89 },
    { id: 'c2', author: 'Mike Ross', text: 'The interview scenario they showed was so relatable lol.', timestamp: '2024-12-04T15:30:00Z', likes: 67 },
    { id: 'c3', author: 'Diana Prince', text: 'Production quality is top tier. Who made this?', timestamp: '2024-12-03T20:45:00Z', likes: 45 },
  ],
  '5': [ // Dia Arc
    { id: 'c1', author: 'Bruce Wayne', text: 'Arc just keeps innovating. Dia looks game-changing.', timestamp: '2024-12-01T11:30:00Z', likes: 112 },
    { id: 'c2', author: 'Clark Kent', text: 'The community focus in this video is what sets Arc apart.', timestamp: '2024-11-30T14:20:00Z', likes: 78 },
    { id: 'c3', author: 'Peter Parker', text: 'Joined the waitlist immediately after watching this.', timestamp: '2024-11-29T09:00:00Z', likes: 56 },
  ],
  '6': [ // Bump
    { id: 'c1', author: 'Natasha Romanoff', text: 'Zenly vibes are strong. Love the nostalgia play.', timestamp: '2024-10-25T16:00:00Z', likes: 34 },
    { id: 'c2', author: 'Steve Rogers', text: 'Simple message, beautiful execution.', timestamp: '2024-10-24T12:30:00Z', likes: 28 },
  ],
  '7': [ // Ray Bloom
    { id: 'c1', author: 'Tony Stark', text: 'The character design for Ray is so warm and approachable.', timestamp: '2024-11-15T10:45:00Z', likes: 41 },
    { id: 'c2', author: 'Pepper Potts', text: 'This feels different from other AI companion apps. More genuine.', timestamp: '2024-11-14T14:15:00Z', likes: 33 },
  ],
  '8': [ // ElevenLabs
    { id: 'c1', author: 'Thor Odinson', text: 'The voice samples they used are wild. Can barely tell it\'s AI.', timestamp: '2024-12-08T09:30:00Z', likes: 67 },
    { id: 'c2', author: 'Loki Laufeyson', text: 'ElevenLabs keeps pushing the boundaries. Great showcase video.', timestamp: '2024-12-07T18:00:00Z', likes: 52 },
  ],
  '9': [ // Human Interface
    { id: 'c1', author: 'Wanda Maximoff', text: 'The Series B announcement format was really well done.', timestamp: '2024-11-08T11:00:00Z', likes: 29 },
    { id: 'c2', author: 'Vision', text: 'Clear narrative arc. Problem → Solution → Validation → Opportunity.', timestamp: '2024-11-07T16:30:00Z', likes: 24 },
    { id: 'c3', author: 'Stephen Strange', text: 'This is how you do a funding announcement video.', timestamp: '2024-11-06T08:45:00Z', likes: 19 },
  ],
  '10': [ // $3M Funding
    { id: 'c1', author: 'Scott Lang', text: 'Love the vulnerability in sharing the journey. Congrats on the raise!', timestamp: '2024-10-15T13:00:00Z', likes: 45 },
    { id: 'c2', author: 'Hope Van Dyne', text: 'The authenticity here is refreshing. No corporate speak.', timestamp: '2024-10-14T10:20:00Z', likes: 38 },
  ],
  '11': [ // Furqan VC World
    { id: 'c1', author: 'Carol Danvers', text: 'Starting with the mistake was bold. Makes the whole video more credible.', timestamp: '2024-09-20T14:30:00Z', likes: 56 },
    { id: 'c2', author: 'Nick Fury', text: 'This is how you build trust with founders. Transparency.', timestamp: '2024-09-19T11:45:00Z', likes: 42 },
  ],
  '12': [ // Amie
    { id: 'c1', author: 'Shuri', text: 'The micro-interactions in this video are *chef\'s kiss*.', timestamp: '2024-12-02T09:00:00Z', likes: 73 },
    { id: 'c2', author: 'T\'Challa', text: 'Amie\'s design language is so consistent. Great brand video.', timestamp: '2024-12-01T15:30:00Z', likes: 61 },
    { id: 'c3', author: 'Okoye', text: 'Finally a calendar app that doesn\'t look boring.', timestamp: '2024-11-30T12:15:00Z', likes: 48 },
  ],
}

export function getCommentsForVideo(videoId: string): Comment[] {
  return videoComments[videoId] || []
}
