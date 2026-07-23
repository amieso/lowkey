export const PARTNER_CONTACT_EMAIL = 'dennis@amie.so'

/** Mailto CTA for a partner option, shared by /partner and the grid lightbox. */
export function partnerMailto(option: PartnerOption): string {
  return `mailto:${PARTNER_CONTACT_EMAIL}?subject=${encodeURIComponent(`${option.name} — Lowkey`)}`
}

export interface PartnerOption {
  id: string
  name: string
  /** Short supporting line shown on the grid card */
  tagline: string
  /** Fuller pitch shown on the /partner page */
  description: string
}

export const PARTNER_OPTIONS: PartnerOption[] = [
  {
    id: 'reach',
    name: 'Advertise',
    tagline: 'Reach founders & product teams',
    description:
      'Put your product in front of a focused audience of founders, designers, and product builders. Sponsor the grid, the newsletter, or a featured slot.',
  },
  {
    id: 'launch-support',
    name: 'Launch support',
    tagline: 'Get help shipping your launch video',
    description:
      'From script to final cut, we help you plan, produce, and launch a video that lands. Hands-on support for your next big moment.',
  },
  {
    id: 'find-editor',
    name: 'Hire an editor',
    tagline: 'Get matched with the right video editor',
    description:
      'Know what you want but not who can make it? We connect you with vetted editors from our network — matched to your style, budget, and timeline.',
  },
  {
    id: 'submit',
    name: 'Submit',
    tagline: 'Add your launch video to Lowkey',
    description:
      'Made something great? Submit your launch video to be featured in the curated collection seen by thousands of builders.',
  },
]
