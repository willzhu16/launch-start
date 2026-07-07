// Full-content RSS: published posts + log
// entries (weeks and retros), newest 30, each item carrying its canonical URL.

import { loadRenderers } from 'astro:container';
import { render } from 'astro:content';
import { getContainerRenderer } from '@astrojs/mdx/container-renderer';
import rss, { type RSSFeedItem } from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { site } from '../data/site';
import { latestWriting, logPath } from '../lib/content';

export const GET: APIRoute = async (context) => {
  const writing = await latestWriting(30);

  const renderers = await loadRenderers([getContainerRenderer()]);
  const container = await AstroContainer.create({ renderers });

  const items: RSSFeedItem[] = [];
  for (const item of writing) {
    const { Content } = await render(item.entry);
    const content = await container.renderToString(Content);
    if (item.type === 'log') {
      const project = item.entry.data.project.id;
      items.push({
        title: item.entry.data.title,
        link: logPath(item.entry),
        pubDate: item.entry.data.date,
        description: item.entry.data.tldr,
        content,
        categories: [project, 'log'],
      });
    } else {
      items.push({
        title: item.entry.data.title,
        link: `/blog/${item.entry.id}/`,
        pubDate: item.entry.data.date,
        description: item.entry.data.description,
        content,
        categories: [...item.entry.data.tags, 'post'],
      });
    }
  }

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.origin,
    items,
    customData: '<language>en</language>',
  });
};
