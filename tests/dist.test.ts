import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { site } from '../src/data/site';
import { isDatePublished } from '../src/lib/publish';

// Post-build smoke gate: it reads the freshly built dist/ and asserts every
// scheduled/draft rule actually landed on disk, so no page has to be clicked by
// hand. It deliberately reads the real wall clock — the SAME clock `astro build`
// used moments earlier — so the published set it expects equals what shipped.
// (The unit-test style guide forbids wall-clock reads; this is a build gate, not
// a unit test, so the exception is intentional.)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'content');
const DIST = join(ROOT, 'dist');
const now = new Date();

interface Entry {
  title: string;
  date: Date;
  draft: boolean;
  urlPath: string;
}

/** Reads top-level `key: value` scalars from an mdx frontmatter block. */
function readFrontmatter(filePath: string): Record<string, string> {
  const text = readFileSync(filePath, 'utf8');
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!block) throw new Error(`no frontmatter found in ${filePath}`);
  const fields: Record<string, string> = {};
  for (const line of block[1].split(/\r?\n/)) {
    // Indented lines belong to arrays/objects (shipped, sprints, …) — skip them.
    const field = /^([A-Za-z_]\w*):\s?(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

/** Strips a single layer of surrounding single or double quotes. */
function unquote(value: string): string {
  return value.replace(/^['"]/, '').replace(/['"]$/, '');
}

function toEntry(fields: Record<string, string>, urlPath: string): Entry {
  // Frontmatter dates are `YYYY-MM-DD`; `new Date` reads them as UTC midnight,
  // exactly like z.coerce.date() in content.config.ts.
  return {
    title: unquote(fields.title ?? ''),
    date: new Date(fields.date),
    draft: fields.draft === 'true',
    urlPath,
  };
}

function collectPosts(): Entry[] {
  const dir = join(CONTENT, 'posts');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) =>
      toEntry(readFrontmatter(join(dir, name)), `/blog/${name.replace(/\.mdx$/, '')}/`),
    );
}

function collectLogs(): Entry[] {
  const base = join(CONTENT, 'logs');
  const entries: Entry[] = [];
  for (const project of readdirSync(base, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const dir = join(base, project.name);
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.mdx'))) {
      const file = name.replace(/\.mdx$/, '');
      entries.push(
        toEntry(readFrontmatter(join(dir, name)), `/projects/${project.name}/log/${file}/`),
      );
    }
  }
  return entries;
}

/** Mirrors published() in content.ts for prod builds: draft + scheduled-date gates. */
function isPublished(entry: Entry): boolean {
  return !entry.draft && isDatePublished(entry.date, now, site.timezone);
}

function pageFile(entry: Entry): string {
  return join(DIST, entry.urlPath, 'index.html');
}

function htmlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...htmlFiles(path));
    else if (item.name.endsWith('.html')) files.push(path);
  }
  return files;
}

function builtPath(urlPath: string): string {
  const path = urlPath.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  if (!path) return join(DIST, 'index.html');
  if (/\.[a-z0-9]+$/i.test(path)) return join(DIST, path);
  return join(DIST, path, 'index.html');
}

const posts = collectPosts();
const logs = collectLogs();
const publishedPosts = posts.filter(isPublished);
const publishedLogs = logs.filter(isPublished);
const hidden = [...posts, ...logs].filter((entry) => !isPublished(entry));

describe('dist smoke suite', () => {
  it('has a built dist/ directory (run `pnpm build` first)', () => {
    expect(
      existsSync(DIST),
      `dist/ not found at ${DIST} — run \`pnpm build\` before pnpm test:dist`,
    ).toBe(true);
  });

  it('renders a non-trivial home page', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain(site.title);
  });

  for (const post of publishedPosts) {
    it(`publishes ${post.urlPath} with its title in the page`, () => {
      expect(existsSync(pageFile(post)), `missing ${pageFile(post)}`).toBe(true);
      expect(readFileSync(pageFile(post), 'utf8')).toContain(post.title);
    });
  }

  for (const log of publishedLogs) {
    it(`publishes ${log.urlPath}`, () => {
      expect(existsSync(pageFile(log)), `missing ${pageFile(log)}`).toBe(true);
    });
  }

  for (const entry of hidden) {
    it(`keeps draft/future entry ${entry.urlPath} out of dist`, () => {
      expect(existsSync(pageFile(entry)), `${entry.urlPath} should not be built`).toBe(false);
    });
  }

  it('lists every published title on the blog index', () => {
    const html = readFileSync(join(DIST, 'blog', 'index.html'), 'utf8');
    for (const entry of [...publishedPosts, ...publishedLogs]) {
      expect(html, `blog index missing "${entry.title}"`).toContain(entry.title);
    }
  });

  it('includes every feed-eligible item link in rss.xml', () => {
    const rssPath = join(DIST, 'rss.xml');
    expect(existsSync(rssPath), `missing ${rssPath}`).toBe(true);
    const rss = readFileSync(rssPath, 'utf8');
    // The feed carries only the newest 30 items (latestWriting(30) in
    // rss.xml.ts). Compare path portions only — the absolute origin
    // (SITE_ORIGIN) is not pinned here.
    const feedItems = [...publishedPosts, ...publishedLogs]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);
    for (const entry of feedItems) {
      expect(rss, `rss.xml missing ${entry.urlPath}`).toContain(entry.urlPath);
    }
  });

  it('emits a sitemap index', () => {
    expect(existsSync(join(DIST, 'sitemap-index.xml'))).toBe(true);
  });

  it('emits indexable metadata without duplicated site titles', () => {
    for (const file of htmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      expect(html, `${file} has a duplicated site title`).not.toContain(
        `${site.title} · ${site.title}`,
      );

      if (file.endsWith('404.html')) {
        expect(html).toContain('<meta name="robots" content="noindex, follow">');
        expect(html).not.toContain('<link rel="canonical"');
      } else {
        expect(html).toMatch(
          new RegExp(`<link rel="canonical" href="${site.origin.replaceAll('.', '\\.')}`),
        );
      }
    }
  });

  it('has no broken root-relative href or src references', () => {
    const references = /(?:href|src)="(\/[^"#?]*(?:[?#][^"]*)?)"/g;
    for (const file of htmlFiles(DIST)) {
      const html = readFileSync(file, 'utf8');
      for (const [, reference] of html.matchAll(references)) {
        expect(existsSync(builtPath(reference)), `${file} references missing ${reference}`).toBe(
          true,
        );
      }
    }
  });

  it('ships the Cloudflare security-header policy', () => {
    const headersPath = join(DIST, '_headers');
    expect(existsSync(headersPath), `missing ${headersPath}`).toBe(true);
    const headers = readFileSync(headersPath, 'utf8');
    expect(headers).toContain('Content-Security-Policy:');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Robots-Tag: noindex');
  });
});
