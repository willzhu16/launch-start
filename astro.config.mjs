// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { SITE_ORIGIN } from './src/data/origin.mjs';

export default defineConfig({
  site: SITE_ORIGIN,
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
});
