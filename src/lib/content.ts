// Shared content queries (spec 03 §2). Every page queries through published() —
// nothing touches getCollection() raw. Cross-entry integrity rules that a single
// zod schema can't see live in assertContentIntegrity(), called once per build.
import { type CollectionEntry, getCollection } from 'astro:content';
import { activeSprint, upcomingSprint } from './sprint';

type Publishable = { data: { draft: boolean } };

/** Drafts render in dev (with a DRAFT lozenge) and vanish from prod builds. */
export function published<T extends Publishable>(entries: T[]): T[] {
  if (import.meta.env.DEV) return entries;
  return entries.filter((e) => !e.data.draft);
}

export async function publishedProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = published(await getCollection('projects'));
  return projects.sort((a, b) => b.data.createdDate.getTime() - a.data.createdDate.getTime());
}

export async function publishedLogs(): Promise<CollectionEntry<'logs'>[]> {
  const logs = published(await getCollection('logs'));
  return logs.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function publishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = published(await getCollection('posts'));
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export type WritingItem =
  | { type: 'log'; entry: CollectionEntry<'logs'> }
  | { type: 'post'; entry: CollectionEntry<'posts'> };

/** Newest posts and log entries mixed (home "Recent writing" rail, L-19). */
export async function latestWriting(limit: number): Promise<WritingItem[]> {
  const logs = (await publishedLogs()).map((entry) => ({ type: 'log' as const, entry }));
  const posts = (await publishedPosts()).map((entry) => ({ type: 'post' as const, entry }));
  return [...logs, ...posts]
    .sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime())
    .slice(0, limit);
}

/** Newest project with a sprint whose window contains today (home banner). */
export async function activeProject(today: Date): Promise<CollectionEntry<'projects'> | null> {
  const projects = await publishedProjects();
  return projects.find((p) => activeSprint(p.data, today) !== null) ?? null;
}

/** Newest project with a future sprint, for the "next sprint starts …" banner state. */
export async function scheduledProject(today: Date): Promise<CollectionEntry<'projects'> | null> {
  const projects = await publishedProjects();
  return projects.find((p) => upcomingSprint(p.data, today) !== null) ?? null;
}

/** `/projects/<slug>/log/s1-w02/` for a log entry (canonical page, L-19). */
export function logPath(entry: CollectionEntry<'logs'>): string {
  const [project, file] = entry.id.split('/');
  return `/projects/${project}/log/${file}/`;
}

/** The `s1-w02` / `s1-retro` filename part of a log entry id. */
export function logSlug(entry: CollectionEntry<'logs'>): string {
  return entry.id.split('/').at(-1) ?? entry.id;
}

/** `LS-S1-W02` / `LS-S1-RETRO` ticket id (L-21 vocabulary). */
export function ticketId(entry: CollectionEntry<'logs'>): string {
  return `LS-${logSlug(entry).toUpperCase()}`;
}

const KEBAB = /^[a-z0-9-]+$/;
const LOG_FILE = /^s(\d+)-(w(\d{2})|retro)$/;

/**
 * Build-time integrity rules from specs 01/03 that span entries. Throwing here
 * fails `astro build`, which is the CI gate. Warnings log but do not fail.
 */
export async function assertContentIntegrity(): Promise<void> {
  const projects = await getCollection('projects');
  const logs = await getCollection('logs');

  const problems: string[] = [];

  for (const p of projects) {
    if (!KEBAB.test(p.id)) problems.push(`project slug '${p.id}' is not kebab-case`);
  }
  for (const post of await getCollection('posts')) {
    if (!KEBAB.test(post.id)) problems.push(`post slug '${post.id}' is not kebab-case`);
  }

  const featured = projects.filter((p) => p.data.featured);
  if (featured.length > 3) {
    problems.push(`at most 3 featured projects allowed, found ${featured.length}`);
  }

  const retros = new Set<string>();
  for (const log of logs) {
    const project = projects.find((p) => p.id === log.data.project.id);
    if (!project) {
      problems.push(`${log.id}: references unknown project '${log.data.project.id}'`);
      continue;
    }
    const sprint = project.data.sprints.find((s) => s.number === log.data.sprint);
    if (!sprint) {
      problems.push(`${log.id}: sprint ${log.data.sprint} not declared in ${project.id}`);
    }
    const [projectPart, filePart] = log.id.split('/');
    if (projectPart !== log.data.project.id) {
      problems.push(
        `${log.id}: file lives under '${projectPart}' but references '${log.data.project.id}'`,
      );
    }
    const m = filePart ? LOG_FILE.exec(filePart) : null;
    if (!m) {
      problems.push(`${log.id}: filename must be s<sprint>-w<week padded 2> or s<sprint>-retro`);
    } else {
      if (Number(m[1]) !== log.data.sprint) {
        problems.push(
          `${log.id}: filename sprint ${m[1]} != frontmatter sprint ${log.data.sprint}`,
        );
      }
      if (log.data.kind === 'retro' && m[2] !== 'retro') {
        problems.push(`${log.id}: retro entries must be named s<sprint>-retro`);
      }
      if (log.data.kind === 'week' && Number(m[3]) !== log.data.week) {
        problems.push(`${log.id}: filename week ${m[3]} != frontmatter week ${log.data.week}`);
      }
    }
    if (log.data.kind === 'retro') {
      const key = `${log.data.project.id}#${log.data.sprint}`;
      if (retros.has(key)) problems.push(`duplicate retro for ${key}`);
      retros.add(key);
    }
  }

  // Warn (not fail): a sprint with an outcome should have a retrospective (L-35).
  for (const p of projects) {
    for (const s of p.data.sprints) {
      if (s.outcome && !retros.has(`${p.id}#${s.number}`)) {
        console.warn(
          `[content] warn: ${p.id} sprint ${s.number} has an outcome but no retro entry`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n- ${problems.join('\n- ')}`);
  }
}
