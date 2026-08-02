// Nightly external-data sync: resolves every repo and videoId referenced in
// content frontmatter into committed snapshots under src/data/generated/, so
// builds stay network-free and an API outage can only leave data stale, never
// break a page. Run by .github/workflows/sync.yml; locally: pnpm sync.
//
// GITHUB_TOKEN raises the GitHub rate limit (optional). YOUTUBE_API_KEY is
// required only once content references a videoId. The .ts import works
// because Node 24 strips types natively.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  frontmatterOf,
  referencedRepos,
  referencedVideoIds,
  snapshotJson,
  toGitHubFacts,
  toYouTubeFacts,
} from '../src/lib/sync.ts';

const CONTENT_DIR = new URL('../src/content/', import.meta.url);
const GENERATED_DIR = new URL('../src/data/generated/', import.meta.url);

async function contentFrontmatters() {
  const entries = await readdir(CONTENT_DIR, { recursive: true, withFileTypes: true });
  const frontmatters = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;
    const text = await readFile(join(entry.parentPath, entry.name), 'utf8');
    const frontmatter = frontmatterOf(text);
    if (frontmatter) frontmatters.push(frontmatter);
  }
  return frontmatters;
}

async function syncGitHub(repos, fetchedAt) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'launch-start-sync',
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const snapshot = {};
  for (const repo of repos) {
    const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!repoResponse.ok) throw new Error(`GitHub responded ${repoResponse.status} for ${repo}`);
    const releaseResponse = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers,
    });
    if (!releaseResponse.ok && releaseResponse.status !== 404) {
      throw new Error(`GitHub responded ${releaseResponse.status} for ${repo}/releases/latest`);
    }
    const release = releaseResponse.ok ? await releaseResponse.json() : null;
    snapshot[repo] = toGitHubFacts(await repoResponse.json(), release, fetchedAt);
  }
  return snapshot;
}

async function syncYouTube(videoIds, fetchedAt) {
  if (videoIds.length === 0) return {};
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(`YOUTUBE_API_KEY is unset but content references: ${videoIds.join(', ')}`);
  }
  const snapshot = {};
  for (let start = 0; start < videoIds.length; start += 50) {
    const batch = videoIds.slice(start, start + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', key);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API responded ${response.status} for ids ${batch.join(', ')}`);
    }
    const body = await response.json();
    for (const item of body.items ?? []) snapshot[item.id] = toYouTubeFacts(item, fetchedAt);
    for (const id of batch) {
      if (!snapshot[id])
        console.warn(`videoId ${id} was not returned by the API (deleted or private?)`);
    }
  }
  return snapshot;
}

const fetchedAt = new Date().toISOString();
const frontmatters = await contentFrontmatters();
const repos = referencedRepos(frontmatters);
const videoIds = referencedVideoIds(frontmatters);

const github = await syncGitHub(repos, fetchedAt);
await writeFile(new URL('github.json', GENERATED_DIR), snapshotJson(github));
console.log(`github.json: ${repos.length} repo(s)`);

const youtube = await syncYouTube(videoIds, fetchedAt);
await writeFile(new URL('youtube.json', GENERATED_DIR), snapshotJson(youtube));
console.log(`youtube.json: ${Object.keys(youtube).length} video(s)`);
