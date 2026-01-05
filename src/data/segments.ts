import { Segment } from '@/types/video'

const videoSegments: Record<string, Segment[]> = {
  '1': [ // Lovable Launch (92s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The video opens with a bold, attention-grabbing statement about the challenges of building software. Quick cuts and dynamic typography establish the tone and immediately connect with the viewer\'s pain points.', startTime: 0, endTime: 12 },
    { id: 's2', type: 'problem', title: 'Problem', description: 'This segment dives deep into the frustration of traditional software development. Through relatable scenarios and compelling visuals, it highlights the gap between having an idea and actually bringing it to life - the months of coding, debugging, and iteration.', startTime: 12, endTime: 28 },
    { id: 's3', type: 'solution', title: 'Solution', description: 'Lovable is introduced as the breakthrough solution. The messaging shifts to hope and possibility, showing how AI can transform descriptions into working software. Clean UI shots demonstrate the simplicity of the platform.', startTime: 28, endTime: 55 },
    { id: 's4', type: 'in-action', title: 'In Action', description: 'A live demonstration takes center stage, showing real-time code generation and instant preview capabilities. The viewer watches as a complete application materializes from a simple text description, making the value proposition tangible.', startTime: 55, endTime: 78 },
    { id: 's5', type: 'cta', title: 'CTA', description: 'The video closes with a clear, compelling call-to-action. "Try Lovable for free" appears prominently, accompanied by a sense of urgency and the promise of immediate results.', startTime: 78, endTime: 92 },
  ],
  '2': [ // Lightfield (187s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'An atmospheric opening sequence establishes the visual tone and brand identity. Sweeping visuals and ambient sound design create a sense of wonder and possibility, drawing viewers into the world of spatial computing.', startTime: 0, endTime: 25 },
    { id: 's2', type: 'problem', title: 'Problem', description: 'The limitations of current capture technology are explored through striking visual comparisons. Flat images, fixed perspectives, and the inability to truly preserve moments are presented as problems waiting to be solved.', startTime: 25, endTime: 70 },
    { id: 's3', type: 'solution', title: 'Solution', description: 'The technological breakthrough is unveiled. Light field capture is explained through elegant visualizations that make complex technology feel accessible. The unique approach to capturing every ray of light is demonstrated.', startTime: 70, endTime: 120 },
    { id: 's4', type: 'in-action', title: 'In Action', description: 'Real-world applications come to life: medical imaging, virtual production, real estate tours. Each use case is shown with actual footage, demonstrating the technology\'s transformative potential across industries.', startTime: 120, endTime: 165 },
    { id: 's5', type: 'cta', title: 'CTA', description: 'A forward-looking vision statement positions viewers at the edge of a new era. The invitation to join the future feels both exclusive and inevitable.', startTime: 165, endTime: 187 },
  ],
  '3': [ // ChatGPT Atlas (98s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The opening challenges conventional browsing paradigms. Quick cuts of endless tabs, scattered bookmarks, and context-switching frustration set up the promise of something fundamentally different.', startTime: 0, endTime: 15 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'Atlas is introduced as the browser that truly understands intent. The seamless AI integration is showcased through elegant UI animations, demonstrating how search, summary, and synthesis become one fluid experience.', startTime: 15, endTime: 40 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'A comprehensive demonstration shows Atlas navigating complex research tasks. Multiple sources are pulled together, fact-checking happens in real-time, and the viewer sees intelligent browsing in action across various use cases.', startTime: 40, endTime: 80 },
    { id: 's4', type: 'cta', title: 'CTA', description: 'The wrap-up reinforces the core value proposition with a memorable tagline. The invitation to explore Atlas feels like joining an exclusive preview of the future.', startTime: 80, endTime: 98 },
  ],
  '4': [ // Cluely (99s)
    { id: 's1', type: 'problem', title: 'Problem', description: 'A relatable interview scenario unfolds. The viewer watches as anxiety builds, a difficult question lands, and that familiar feeling of mind-going-blank is captured perfectly. The emotional hook is immediate and visceral.', startTime: 0, endTime: 18 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'Cluely emerges as the invisible advantage. The positioning is bold and unapologetic - an AI assistant that listens, analyzes, and suggests in real-time, all while remaining completely undetectable.', startTime: 18, endTime: 45 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'Multiple real-world scenarios demonstrate Cluely\'s capabilities. Technical interview questions get instant framework suggestions. Behavioral questions receive structured response templates. The transformation from nervous to confident is palpable.', startTime: 45, endTime: 82 },
    { id: 's4', type: 'cta', title: 'CTA', description: 'A punchy, memorable closing line drives home the value. The call-to-action is direct and confident, matching the product\'s bold positioning.', startTime: 82, endTime: 99 },
  ],
  '5': [ // Dia Arc (78s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The video speaks directly to Arc members, acknowledging their role as early believers. This community-first approach creates immediate emotional connection and positions what follows as a reward for loyalty.', startTime: 0, endTime: 12 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'Dia is unveiled not as a browser, but as an agent. The distinction is crucial and carefully articulated - Dia doesn\'t just show the web, it navigates it on your behalf. The paradigm shift is presented as evolution, not revolution.', startTime: 12, endTime: 35 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'Practical demonstrations show Dia handling research tasks, shopping comparisons, and travel planning autonomously. Each example reinforces the "agent not browser" positioning with tangible, time-saving use cases.', startTime: 35, endTime: 62 },
    { id: 's4', type: 'cta', title: 'CTA', description: 'The waitlist invitation carries exclusivity. Being "first" to experience the reimagined web feels like a privilege earned through community membership.', startTime: 62, endTime: 78 },
  ],
  '6': [ // Bump (51s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'Nostalgia drives the opening as Zenly\'s legacy is invoked. For those who remember, the connection is instant. For newcomers, the pedigree establishes credibility and hints at something special.', startTime: 0, endTime: 15 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'Bump is positioned as the spiritual successor - a new way to stay close to the people who matter. The focus on genuine connection over social media metrics resonates with growing platform fatigue.', startTime: 15, endTime: 38 },
    { id: 's3', type: 'cta', title: 'CTA', description: 'The download prompt is simple and direct, with app store links prominently displayed. The messaging stays warm and personal, inviting viewers to reconnect with what matters.', startTime: 38, endTime: 51 },
  ],
  '7': [ // Ray Bloom (59s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'Ray is introduced with warmth and personality. Unlike typical AI presentations, this feels like meeting someone new. The character design and voice create immediate rapport and differentiation from "assistant" positioning.', startTime: 0, endTime: 18 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'Ray\'s role as a true AI companion is explored. The emphasis on emotional intelligence - helping think through problems, celebrating wins, processing setbacks - positions this as something deeper than utility.', startTime: 18, endTime: 45 },
    { id: 's3', type: 'cta', title: 'CTA', description: 'The invitation to meet Ray feels personal rather than transactional. "Say hello" captures the companion positioning perfectly, making the first interaction feel like the beginning of a relationship.', startTime: 45, endTime: 59 },
  ],
  '8': [ // ElevenLabs (48s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'Voice AI capabilities are showcased through stunning audio examples that blur the line between human and synthetic. The opening immediately demonstrates the technology\'s remarkable fidelity.', startTime: 0, endTime: 12 },
    { id: 's2', type: 'in-action', title: 'In Action', description: 'Feature highlights move rapidly through the platform\'s capabilities: voice cloning, multilingual generation, and the new voice design feature. Each capability is demonstrated with compelling examples that spark creative possibilities.', startTime: 12, endTime: 32 },
    { id: 's3', type: 'cta', title: 'CTA', description: 'The closing empowers viewers to become creators. "Your voice. Unlimited." captures the democratization of audio production that ElevenLabs enables.', startTime: 32, endTime: 48 },
  ],
  '9': [ // Human Interface (211s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The company\'s mission is established with conviction and clarity. The founding belief that technology should feel human sets up everything that follows, creating a philosophical foundation for the product.', startTime: 0, endTime: 30 },
    { id: 's2', type: 'problem', title: 'Problem', description: 'The market opportunity is articulated through the lens of user frustration. The problem isn\'t AI capability - it\'s the interaction paradigm. This reframing positions Human Interface as solving a deeper, more fundamental challenge.', startTime: 30, endTime: 75 },
    { id: 's3', type: 'solution', title: 'Solution', description: 'A deep dive into the product reveals how it learns, anticipates, and delivers. Technical capability is balanced with human-centered design philosophy, making the technology feel approachable despite its sophistication.', startTime: 75, endTime: 140 },
    { id: 's4', type: 'in-action', title: 'In Action', description: 'The Series B announcement carries momentum and validation. Growth metrics, investor names, and trajectory data build confidence while maintaining the human-centered narrative that defines the brand.', startTime: 140, endTime: 185 },
    { id: 's5', type: 'cta', title: 'CTA', description: 'Career opportunities are presented as a chance to join a mission, not just a company. The invitation to make technology more human feels both ambitious and achievable.', startTime: 185, endTime: 211 },
  ],
  '10': [ // $3M Funding (85s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The announcement opens with energy and excitement. "Big news" creates immediate anticipation, and the reveal of the seed round landing feels like a milestone shared with the community.', startTime: 0, endTime: 20 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'The journey is shared with vulnerability and authenticity. Late nights, pivots, and moments of doubt are acknowledged before the triumph. This transparency builds trust and emotional investment in the story.', startTime: 20, endTime: 55 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'The roadmap preview gives the funding context and purpose. New features, integrations, and performance improvements show exactly how the investment will translate to user value.', startTime: 55, endTime: 72 },
    { id: 's4', type: 'cta', title: 'CTA', description: 'Gratitude anchors the close. The community acknowledgment feels genuine, and "this is just the beginning" creates anticipation without overpromising.', startTime: 72, endTime: 85 },
  ],
  '11': [ // Furqan VC World (90s)
    { id: 's1', type: 'problem', title: 'Problem', description: 'A personal story of misstep opens the narrative. The vulnerability is disarming and immediately differentiating - this isn\'t typical VC positioning. The mistake becomes the foundation for something better.', startTime: 0, endTime: 25 },
    { id: 's2', type: 'solution', title: 'Solution', description: 'A new approach to venture capital emerges from the lessons learned. Relationships over returns, support over pressure - the positioning challenges industry norms while feeling authentic to the founder\'s journey.', startTime: 25, endTime: 55 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'Early results and foundation-building demonstrate that the philosophy works in practice. Case studies and testimonials provide proof points for the differentiated approach.', startTime: 55, endTime: 78 },
    { id: 's4', type: 'cta', title: 'CTA', description: 'The invitation to reach out feels personal and open. "Let\'s talk" reinforces the relationship-first positioning and lowers the barrier to engagement.', startTime: 78, endTime: 90 },
  ],
  '12': [ // Amie (54s)
    { id: 's1', type: 'intro', title: 'Hook', description: 'The promise of joyful productivity immediately differentiates Amie from utility-focused competitors. The word "joy" does heavy lifting, suggesting an emotional relationship with the tool rather than mere functionality.', startTime: 0, endTime: 15 },
    { id: 's2', type: 'in-action', title: 'In Action', description: 'Calendar features are showcased with smooth, delightful animations that prove the "joy" positioning. Every interaction feels considered, every transition satisfying. The design speaks as loudly as the functionality.', startTime: 15, endTime: 32 },
    { id: 's3', type: 'in-action', title: 'In Action', description: 'Task management and integrations expand the value proposition while maintaining the aesthetic coherence. Everything working together in one beautiful place makes the productivity promise feel achievable.', startTime: 32, endTime: 45 },
    { id: 's4', type: 'cta', title: 'CTA', description: '"Fall in love with your calendar again" perfectly captures the emotional positioning. The download invitation feels like an opportunity to rediscover something that had become mundane.', startTime: 45, endTime: 54 },
  ],
}

export function getSegmentsForVideo(videoId: string): Segment[] {
  return videoSegments[videoId] || []
}
