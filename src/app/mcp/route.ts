// Lowkey MCP server — exposes the launch-video catalog to MCP clients
// (claude.ai custom connectors, Claude Code, the Claude API MCP connector).
// Streamable HTTP at /mcp. Public read-only data, no auth.

import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { getVideoDetail, listCompanies, listCreators, searchTranscripts, searchVideos } from '@/lib/catalog'

const LAUNCH_TYPES = ['product-launch', 'feature-release', 'model-release', 'funding', 'rebrand', 'other'] as const
const STYLE_TAGS = [
  'screen-recording', 'product-ui', 'motion-graphics', '3d-render', 'live-action',
  'talking-head', 'kinetic-typography', 'animation', 'cinematic', 'mixed-media',
] as const

const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 1) }] })

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_videos',
      {
        title: 'Search videos',
        description:
          'Search and filter Lowkey\'s curated product launch videos. Free-text query matches title, company, description, transcript, and on-screen text. Returns compact summaries; use get_video for full detail.',
        inputSchema: z.object({
          query: z.string().optional().describe('Free-text search terms'),
          company: z.string().optional().describe('Company slug, e.g. "openai"'),
          launchType: z.enum(LAUNCH_TYPES).optional(),
          styleTag: z.enum(STYLE_TAGS).optional(),
          aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']).optional(),
          hasSpeech: z.boolean().optional().describe('true = voiceover/dialogue, false = music-only'),
          minDuration: z.number().optional().describe('Seconds'),
          maxDuration: z.number().optional().describe('Seconds'),
          sort: z.enum(['newest', 'popularity', 'engagement']).optional().describe('popularity = X impressions, engagement = interactions per impression; default newest'),
          limit: z.number().int().min(1).max(50).optional(),
          offset: z.number().int().min(0).optional(),
        }),
      },
      async (args) => json(searchVideos(args)),
    )

    server.registerTool(
      'get_video',
      {
        title: 'Get video detail',
        description:
          'Full record for one video: description, credits, chapters with narrative beats, beat statistics (demo share, time-to-product), visual summary, on-screen text, pacing (cuts/min), audio profile, color palette, full transcript, and X engagement metrics.',
        inputSchema: z.object({
          video: z.string().describe('Video path "companySlug/slug" (e.g. "framer/3-0") or numeric id'),
        }),
      },
      async ({ video }) => {
        const detail = getVideoDetail(video)
        return json(detail ?? { error: `No video found for "${video}". Use search_videos or list_companies to find valid paths.` })
      },
    )

    server.registerTool(
      'list_companies',
      {
        title: 'List companies',
        description: 'All companies in the catalog with their videos. Good starting point to see scope.',
        inputSchema: z.object({}),
      },
      async () => json(listCompanies()),
    )

    server.registerTool(
      'list_creators',
      {
        title: 'List creators',
        description: 'People and agencies credited on the videos, with their filmographies. Optional role filter (e.g. "founder", "agency", "creator").',
        inputSchema: z.object({
          role: z.string().optional().describe('Case-insensitive substring match on the credit role'),
        }),
      },
      async ({ role }) => json(listCreators(role)),
    )

    server.registerTool(
      'search_transcripts',
      {
        title: 'Search transcripts & on-screen text',
        description:
          'Full-text search over what is said (voiceover/dialogue) and what is shown as on-screen text across all launch videos. Returns timestamped matches per video.',
        inputSchema: z.object({
          query: z.string().min(2).describe('Phrase or word to find'),
          limit: z.number().int().min(1).max(25).optional().describe('Max videos returned (default 10)'),
        }),
      },
      async ({ query, limit }) => json(searchTranscripts(query, limit)),
    )
  },
  {
    serverInfo: { name: 'lowkey', version: '1.0.0' },
  },
)

export { handler as GET, handler as POST }
