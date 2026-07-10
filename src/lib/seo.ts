// JSON-LD builders for the core schema.org types, with correct canonical URLs.
import { site } from '../data/site';

export function absoluteUrl(path: string): string {
  return new URL(path, site.origin).href;
}

/**
 * JSON for an inline <script> body. Every angle bracket is emitted as the
 * unicode escape u003c, so no content string (a title containing a closing
 * script tag, say) can terminate the element early.
 */
export function serializeJsonLd(ld: Record<string, unknown>): string {
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

export function personLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.author,
    ...(site.email ? { email: `mailto:${site.email}` } : {}),
    url: absoluteUrl('/about/'),
    ...(site.socials.github || site.socials.linkedin
      ? { sameAs: [site.socials.github, site.socials.linkedin].filter(Boolean) }
      : {}),
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.title,
    description: site.description,
    url: site.origin,
  };
}

export function blogPostingLd(input: {
  title: string;
  description: string;
  path: string;
  date: Date;
  updated?: Date;
  partOfPath?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    datePublished: input.date.toISOString(),
    ...(input.updated ? { dateModified: input.updated.toISOString() } : {}),
    author: { '@type': 'Person', name: site.author, url: absoluteUrl('/about/') },
    ...(input.partOfPath ? { isPartOf: absoluteUrl(input.partOfPath) } : {}),
  };
}

export function projectLd(input: {
  title: string;
  description: string;
  path: string;
  repo?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': input.repo ? 'SoftwareSourceCode' : 'CreativeWork',
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    ...(input.repo ? { codeRepository: `https://github.com/${input.repo}` } : {}),
    author: { '@type': 'Person', name: site.author, url: absoluteUrl('/about/') },
  };
}

export function blogLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${site.title} — Blog`,
    url: absoluteUrl('/blog/'),
  };
}

export function collectionPageLd(input: { name: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: absoluteUrl(input.path),
  };
}

export function profilePageLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: personLd(),
  };
}
