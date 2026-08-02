// Pure logic for the nightly external-data sync: frontmatter scanning,
// API-response mapping, and stable snapshot serialization. Deterministic and
// network-free so it stays unit-testable; scripts/sync-external.mjs owns
// fetching and file IO.
import type { GitHubFacts, YouTubeFacts } from './generated';

/** The YAML frontmatter block of an MDX file, or null when the file has none. */
export function frontmatterOf(text: string): string | null {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? null;
}

function collect(frontmatters: string[], pattern: RegExp): string[] {
  const found = new Set<string>();
  for (const frontmatter of frontmatters) {
    for (const match of frontmatter.matchAll(pattern)) {
      found.add(match[1]);
    }
  }
  return [...found].sort();
}

/** Unique, sorted YouTube video ids referenced by the given frontmatter blocks. */
export function referencedVideoIds(frontmatters: string[]): string[] {
  return collect(frontmatters, /^\s*videoId:\s*['"]?([A-Za-z0-9_-]{11})['"]?\s*$/gm);
}

/** Unique, sorted owner/name repos referenced by the given frontmatter blocks. */
export function referencedRepos(frontmatters: string[]): string[] {
  return collect(frontmatters, /^\s*repo:\s*['"]?([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+)['"]?\s*$/gm);
}

/** Seconds encoded by a YouTube ISO 8601 duration like 'PT1H2M3S'; 0 when unparseable. */
export function isoDurationSeconds(duration: string): number {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

/** The slice of a videos.list item the sync consumes. */
export interface YouTubeApiItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    thumbnails: Partial<Record<string, { url: string }>>;
  };
  contentDetails: { duration: string };
}

/** Snapshot entry for one item of a YouTube videos.list response. */
export function toYouTubeFacts(item: YouTubeApiItem, fetchedAt: string): YouTubeFacts {
  const thumbnails = item.snippet.thumbnails;
  const best = thumbnails.maxres ?? thumbnails.standard ?? thumbnails.high;
  return {
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    durationSeconds: isoDurationSeconds(item.contentDetails.duration),
    thumbnailUrl: best?.url ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
    fetchedAt,
  };
}

/** The slice of a GitHub repos response the sync consumes. */
export interface GitHubRepoResponse {
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
}

/** The slice of a GitHub releases/latest response the sync consumes. */
export interface GitHubReleaseResponse {
  tag_name: string;
  published_at: string;
  html_url: string;
}

/** Snapshot entry for one repo, from its repos and releases/latest responses. */
export function toGitHubFacts(
  repo: GitHubRepoResponse,
  release: GitHubReleaseResponse | null,
  fetchedAt: string,
): GitHubFacts {
  return {
    url: repo.html_url,
    description: repo.description,
    stars: repo.stargazers_count,
    primaryLanguage: repo.language,
    latestRelease: release
      ? { tag: release.tag_name, date: release.published_at, url: release.html_url }
      : null,
    lastCommitDate: repo.pushed_at,
    fetchedAt,
  };
}

/** Deterministic snapshot JSON: sorted keys, two-space indent, trailing newline. */
export function snapshotJson(entries: Record<string, unknown>): string {
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
