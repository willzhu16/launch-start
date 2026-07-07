// Typed access to the committed sync snapshots. Components render
// nothing when a key is absent — no skeletons, no errors.
import githubJson from '../data/generated/github.json';
import youtubeJson from '../data/generated/youtube.json';

export interface GitHubFacts {
  url: string;
  description: string | null;
  stars: number;
  primaryLanguage: string | null;
  latestRelease: { tag: string; date: string; url: string } | null;
  lastCommitDate: string;
  fetchedAt: string;
}

export interface YouTubeFacts {
  title: string;
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
  fetchedAt: string;
}

const github = githubJson as Record<string, GitHubFacts>;
const youtube = youtubeJson as Record<string, YouTubeFacts>;

export function githubFacts(repo: string | undefined): GitHubFacts | null {
  if (!repo) return null;
  return github[repo] ?? null;
}

export function youtubeFacts(videoId: string | undefined): YouTubeFacts | null {
  if (!videoId) return null;
  return youtube[videoId] ?? null;
}
