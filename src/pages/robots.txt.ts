// robots.txt as a route so the sitemap URL derives from config —
// nothing in the repo hardcodes the domain.
import type { APIRoute } from 'astro';
import { site } from '../data/site';

export const GET: APIRoute = (context) => {
  const origin = context.site ?? site.origin;
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', origin).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
