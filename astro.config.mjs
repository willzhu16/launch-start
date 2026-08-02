// @ts-check
import { resolve } from 'node:path';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { SITE_ORIGIN } from './src/data/origin.mjs';

// The OG card endpoint (src/pages/og/[...path].png.ts) renders SVG text
// through sharp, whose fontconfig resolves the card fonts via this variable.
// Assigning it here covers POSIX local builds; it does NOT reach libvips'
// separate C runtime environment on Windows, where the variable must exist
// before node starts (deploy.yml sets it explicitly; a Windows build without
// it just renders the cards with fallback fonts).
process.env.FONTCONFIG_PATH ??= resolve('src/assets/og').replaceAll('\\', '/');

export default defineConfig({
  site: SITE_ORIGIN,
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
});
