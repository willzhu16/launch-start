// Site identity is configuration, never hardcoded (L-15). Anything
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

  // Fill these in as the accounts exist; components render nothing while null (L-17 principle).
  socials: {
    github: null as string | null,
    linkedin: null as string | null,
    youtube: null as string | null,
  },
  youtubeChannelId: (process.env.YOUTUBE_CHANNEL_ID ?? null) as string | null,

  // Q2 default: Buttondown. The subscribe form renders only once this is set.
  buttondownUsername: null as string | null,

  // Optional photo/video slot below the home letter intro (L-33); null renders nothing.
  homeMedia: null as HomeMedia,
};
