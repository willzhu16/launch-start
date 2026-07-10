// The single source of the canonical origin. Never hardcode the domain
// anywhere else — pages, feeds, and robots.txt all derive from this via site.ts,
// and astro.config.mjs imports it for `site`.
// Cutover to a purchased domain = set SITE_ORIGIN in the deploy env, or
// change the fallback here.
const configuredOrigin = process.env.SITE_ORIGIN?.trim();

export const SITE_ORIGIN = configuredOrigin || 'https://willzhu.dev';
