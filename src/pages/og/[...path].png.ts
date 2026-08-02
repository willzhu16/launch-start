// Per-page Open Graph cards: one PNG per published post, project, and log
// entry, prerendered at build and referenced through Base's ogImage prop.
// sharp resolves the card fonts through fontconfig, pointed at the committed
// TTFs in src/assets/og (the woff2 files in public/fonts rasterize blank).
import { resolve } from 'node:path';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { site } from '../../data/site';
import {
  logSlug,
  publishedLogs,
  publishedPosts,
  publishedProjects,
  ticketId,
} from '../../lib/content';
import { fmtMono } from '../../lib/dates';
import { ogCardSvg } from '../../lib/og-card';

// Belt to astro.config.mjs's suspenders: harmless when already set, and
// covers this module being loaded outside a full astro build (tests, dev).
process.env.FONTCONFIG_PATH ??= resolve('src/assets/og').replaceAll('\\', '/');

// The first fontconfig scan of a fonts dir can race its own first query
// (observed on Windows and expected on cold CI runners): the first text
// render misses families that resolve fine afterwards in the same process.
// One throwaway render forces the scan before any real card renders.
await sharp(Buffer.from(ogCardSvg({ kicker: 'WARMUP', title: 'Warmup', footer: 'warmup' })))
  .png()
  .toBuffer();

const footer = `${site.author} · ${new URL(site.origin).host}`;

function monoDate(date: Date): string {
  return `${fmtMono(date)} ${date.getUTCFullYear()}`;
}

export async function getStaticPaths() {
  const posts = await publishedPosts();
  const projects = await publishedProjects();
  const logs = await publishedLogs();
  return [
    ...posts.map((post) => ({
      params: { path: `blog/${post.id}` },
      props: { kicker: `BLOG · ${monoDate(post.data.date)}`, title: post.data.title },
    })),
    ...projects.map((project) => ({
      params: { path: `projects/${project.id}` },
      props: { kicker: 'PROJECT', title: project.data.title },
    })),
    ...logs.map((entry) => ({
      params: { path: `projects/${entry.data.project.id}/log/${logSlug(entry)}` },
      props: {
        kicker: `${ticketId(entry)} · ${monoDate(entry.data.date)}`,
        title: entry.data.title,
      },
    })),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const svg = ogCardSvg({ kicker: props.kicker, title: props.title, footer });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
