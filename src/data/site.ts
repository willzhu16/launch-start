// Site identity is configuration, never hardcoded. Anything
// deploy-dependent can be overridden by env (SITE_ORIGIN, YOUTUBE_CHANNEL_ID).
import { SITE_ORIGIN } from './origin.mjs';

interface HomeMediaImage {
  kind: 'image';
  src: string;
  alt: string;
  caption?: string;
}

interface HomeMediaVideo {
  kind: 'video';
  videoId: string;
}

export type HomeMedia = HomeMediaImage | HomeMediaVideo | null;

export const site = {
  origin: SITE_ORIGIN as string,
  title: 'Launch Start',
  tagline: 'Side projects, taken from zero to shipped — in public',
  author: 'William Zhu',
  description:
    'A build-in-public journal: side projects taken from zero to shipped in timed public ' +
    'sprints, documented weekly.',
  email: '',
  // Scheduled posts go live at local midnight in this timezone (IANA name).
  timezone: 'America/Chicago',
  socials: {
    github: 'https://github.com/willzhu16' as string | null,
    linkedin: 'https://www.linkedin.com/in/williamlzhu/' as string | null,
    youtube: null as string | null,
  },
  youtubeChannelId: (process.env.YOUTUBE_CHANNEL_ID ?? null) as string | null,

  // Default: Buttondown. The subscribe form renders only once this is set.
  buttondownUsername: null as string | null,

  // Optional photo/video slot below the home letter intro; null renders nothing.
  homeMedia: null as HomeMedia,
};
