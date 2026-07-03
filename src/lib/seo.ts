// JSON-LD builders (ARCHITECTURE §4.4). Payload details deepen in Phase 1
// (specs/05); Phase 0 ships the core types with correct canonical URLs.
import { site } from '../data/site';

export function absoluteUrl(path: string): string {
  return new URL(path, site.origin).href;
}

export function personLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.author,
    email: `mailto:${site.email}`,
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
