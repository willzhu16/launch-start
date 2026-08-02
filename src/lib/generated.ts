// Typed access to the committed sync snapshots, written nightly by
// scripts/sync-external.mjs. Parsed at build so a malformed snapshot fails
// the build instead of shipping a broken page; components render nothing
// when a key is absent — no skeletons, no errors.
import { z } from 'astro/zod';
import githubJson from '../data/generated/github.json';
import youtubeJson from '../data/generated/youtube.json';

const githubFactsSchema = z.object({
  url: z.url(),
  description: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  primaryLanguage: z.string().nullable(),
  latestRelease: z.object({ tag: z.string(), date: z.string(), url: z.url() }).nullable(),
  lastCommitDate: z.string(),
  fetchedAt: z.string(),
});

const youtubeFactsSchema = z.object({
  title: z.string(),
  publishedAt: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  thumbnailUrl: z.url(),
  fetchedAt: z.string(),
});

export type GitHubFacts = z.infer<typeof githubFactsSchema>;
export type YouTubeFacts = z.infer<typeof youtubeFactsSchema>;

const github = z.record(z.string(), githubFactsSchema).parse(githubJson);
const youtube = z.record(z.string(), youtubeFactsSchema).parse(youtubeJson);

export function githubFacts(repo: string | undefined): GitHubFacts | null {
  if (!repo) return null;
  return github[repo] ?? null;
}

export function youtubeFacts(videoId: string | undefined): YouTubeFacts | null {
  if (!videoId) return null;
  return youtube[videoId] ?? null;
}
