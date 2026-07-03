// The single source of the canonical origin (L-15). Never hardcode the domain
// anywhere else — pages, feeds, and robots.txt all derive from this via site.ts,
// and astro.config.mjs imports it for `site`.
// Cutover to a purchased domain (Q1) = set SITE_ORIGIN in the deploy env, or
// change the fallback here.
export const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://launch-start.workers.dev';
