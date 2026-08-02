import { describe, expect, it } from 'vitest';
import {
  frontmatterOf,
  isoDurationSeconds,
  referencedRepos,
  referencedVideoIds,
  snapshotJson,
  toGitHubFacts,
  toYouTubeFacts,
} from './sync';

const FETCHED_AT = '2026-07-27T09:00:00.000Z';

describe('frontmatterOf', () => {
  it('returns the block between the leading fences', () => {
    expect(frontmatterOf("---\ntitle: 'Hi'\n---\n\nBody")).toBe("title: 'Hi'");
  });

  it('handles CRLF fences', () => {
    expect(frontmatterOf("---\r\ntitle: 'Hi'\r\n---\r\nBody")).toBe("title: 'Hi'");
  });

  it('returns null when the file has no frontmatter', () => {
    expect(frontmatterOf('# Just a heading\n')).toBeNull();
  });
});

describe('referencedVideoIds', () => {
  it('finds quoted top-level and indented ids, deduped and sorted', () => {
    const project = "title: 'P'\nvideoId: 'dQw4w9WgXcQ'";
    const log = "days:\n  - day: 1\n    videoId: 'aBcDeFgHiJ0'\nvideoId: 'dQw4w9WgXcQ'";
    expect(referencedVideoIds([project, log])).toEqual(['aBcDeFgHiJ0', 'dQw4w9WgXcQ']);
  });

  it('ignores ids of the wrong length and videoId mentions in prose keys', () => {
    const frontmatter = "videoId: 'tooshort'\ndescription: 'set videoId: later'";
    expect(referencedVideoIds([frontmatter])).toEqual([]);
  });
});

describe('referencedRepos', () => {
  it('finds owner/name pairs and sorts them', () => {
    const a = "repo: 'willzhu16/launch-start'";
    const b = "repo: 'BearInBlue/contextguard'";
    expect(referencedRepos([a, b])).toEqual(['BearInBlue/contextguard', 'willzhu16/launch-start']);
  });

  it('ignores bare owner values without a slash', () => {
    expect(referencedRepos(["repo: 'BearInBlue'"])).toEqual([]);
  });
});

describe('isoDurationSeconds', () => {
  it('parses minutes and seconds', () => {
    expect(isoDurationSeconds('PT4M13S')).toBe(253);
  });

  it('parses hours', () => {
    expect(isoDurationSeconds('PT1H2M3S')).toBe(3723);
  });

  it('parses day-length durations', () => {
    expect(isoDurationSeconds('P1DT2H')).toBe(93_600);
  });

  it('returns 0 for the P0D live-stream duration', () => {
    expect(isoDurationSeconds('P0D')).toBe(0);
  });

  it('returns 0 for garbage', () => {
    expect(isoDurationSeconds('4:13')).toBe(0);
  });
});

describe('toYouTubeFacts', () => {
  const item = {
    id: 'dQw4w9WgXcQ',
    snippet: {
      title: 'Launch Start, week 4',
      publishedAt: '2026-07-20T15:00:00Z',
      thumbnails: {
        high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
        maxres: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' },
      },
    },
    contentDetails: { duration: 'PT4M13S' },
  };

  it('prefers the maxres thumbnail and parses the duration', () => {
    expect(toYouTubeFacts(item, FETCHED_AT)).toEqual({
      title: 'Launch Start, week 4',
      publishedAt: '2026-07-20T15:00:00Z',
      durationSeconds: 253,
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      fetchedAt: FETCHED_AT,
    });
  });

  it('falls back to the predictable hqdefault url when no thumbnail is listed', () => {
    const bare = { ...item, snippet: { ...item.snippet, thumbnails: {} } };
    expect(toYouTubeFacts(bare, FETCHED_AT).thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });
});

describe('toGitHubFacts', () => {
  const repo = {
    html_url: 'https://github.com/BearInBlue/contextguard',
    description: 'A linter for AI instruction files',
    stargazers_count: 12,
    language: 'TypeScript',
    pushed_at: '2026-07-16T12:00:00Z',
  };

  it('maps repo and release responses into a snapshot entry', () => {
    const release = {
      tag_name: 'v0.1.8',
      published_at: '2026-07-16T12:00:00Z',
      html_url: 'https://github.com/BearInBlue/contextguard/releases/tag/v0.1.8',
    };
    expect(toGitHubFacts(repo, release, FETCHED_AT)).toEqual({
      url: 'https://github.com/BearInBlue/contextguard',
      description: 'A linter for AI instruction files',
      stars: 12,
      primaryLanguage: 'TypeScript',
      latestRelease: {
        tag: 'v0.1.8',
        date: '2026-07-16T12:00:00Z',
        url: 'https://github.com/BearInBlue/contextguard/releases/tag/v0.1.8',
      },
      lastCommitDate: '2026-07-16T12:00:00Z',
      fetchedAt: FETCHED_AT,
    });
  });

  it('keeps latestRelease null for repos without releases', () => {
    expect(toGitHubFacts(repo, null, FETCHED_AT).latestRelease).toBeNull();
  });
});

describe('snapshotJson', () => {
  it('sorts keys and ends with a newline so diffs stay stable', () => {
    expect(snapshotJson({ b: 2, a: 1 })).toBe('{\n  "a": 1,\n  "b": 2\n}\n');
  });

  it('serializes an empty snapshot as the committed placeholder shape', () => {
    expect(snapshotJson({})).toBe('{}\n');
  });
});
