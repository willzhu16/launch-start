// Shared content queries. Every page queries through published() —
// nothing touches getCollection() raw. Cross-entry integrity rules that a single
// zod schema can't see live in assertContentIntegrity(), called once per build.
import { type CollectionEntry, getCollection } from 'astro:content';
import { site } from '../data/site';
import { isDatePublished } from './publish';
import { activeSprint, upcomingSprint } from './sprint';

type Publishable = { data: { draft: boolean; date?: Date } };

/**
 * The single publish gate. Two rules, both bypassed in dev so everything is
 * previewable (drafts render with a DRAFT lozenge):
 * - drafts vanish from prod builds;
 * - scheduled publishing: an entry with a future `date` stays hidden in prod
 *   until that calendar day arrives in site.timezone. The daily deploy cron
 *   rebuilds the site, so a scheduled post goes live on its own — no push
 *   needed. Collections without a `date` (projects) only get the draft rule.
 */
export function published<T extends Publishable>(entries: T[]): T[] {
  if (import.meta.env.DEV) return entries;
  const now = new Date();
  return entries.filter(
    (e) => !e.data.draft && (!e.data.date || isDatePublished(e.data.date, now, site.timezone)),
  );
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

/** Newest posts and log entries mixed (home "Recent writing" rail). */
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

/** `/projects/<slug>/log/s1-w02/` for a log entry (canonical page). */
export function logPath(entry: CollectionEntry<'logs'>): string {
  const [project, file] = entry.id.split('/');
  return `/projects/${project}/log/${file}/`;
}

/** The `s1-w02` / `s1-retro` filename part of a log entry id. */
export function logSlug(entry: CollectionEntry<'logs'>): string {
  return entry.id.split('/').at(-1) ?? entry.id;
}

/** `LS-S1-W02` / `LS-S1-RETRO` ticket id (vocabulary). */
export function ticketId(entry: CollectionEntry<'logs'>): string {
  return `LS-${logSlug(entry).toUpperCase()}`;
}

const KEBAB = /^[a-z0-9-]+$/;
const LOG_FILE = /^s(\d+)-(w(\d{2})|retro)$/;

/** Slugs (project and post ids) must be kebab-case for stable URLs. */
function checkSlugs(entries: readonly { id: string }[], kind: string, problems: string[]): void {
  for (const entry of entries) {
    if (!KEBAB.test(entry.id)) problems.push(`${kind} slug '${entry.id}' is not kebab-case`);
  }
}

/** The home shelf renders at most three featured projects. */
function checkFeaturedCap(projects: CollectionEntry<'projects'>[], problems: string[]): void {
  const featured = projects.filter((p) => p.data.featured);
  if (featured.length > 3) {
    problems.push(`at most 3 featured projects allowed, found ${featured.length}`);
  }
}

/** The log filename must encode the same sprint/week/kind as its frontmatter. */
function checkLogFilename(
  log: CollectionEntry<'logs'>,
  filePart: string | undefined,
  problems: string[],
): void {
  const match = filePart ? LOG_FILE.exec(filePart) : null;
  if (!match) {
    problems.push(`${log.id}: filename must be s<sprint>-w<week padded 2> or s<sprint>-retro`);
    return;
  }
  if (Number(match[1]) !== log.data.sprint) {
    problems.push(
      `${log.id}: filename sprint ${match[1]} != frontmatter sprint ${log.data.sprint}`,
    );
  }
  if (log.data.kind === 'retro' && match[2] !== 'retro') {
    problems.push(`${log.id}: retro entries must be named s<sprint>-retro`);
  }
  if (log.data.kind === 'week' && Number(match[3]) !== log.data.week) {
    problems.push(`${log.id}: filename week ${match[3]} != frontmatter week ${log.data.week}`);
  }
}

/** The log's sprint must be declared, and a week entry must start inside it. */
function checkLogSprint(
  log: CollectionEntry<'logs'>,
  project: CollectionEntry<'projects'>,
  problems: string[],
): void {
  const sprint = project.data.sprints.find((s) => s.number === log.data.sprint);
  if (!sprint) {
    problems.push(`${log.id}: sprint ${log.data.sprint} not declared in ${project.id}`);
    return;
  }
  // Week N covers days (N-1)*7+1 .. N*7; its first day must fall inside the sprint,
  // or the entry page's "Day a–b of len" kicker turns nonsensical.
  if (log.data.kind === 'week' && log.data.week !== undefined) {
    if ((log.data.week - 1) * 7 + 1 > sprint.lengthDays) {
      problems.push(
        `${log.id}: week ${log.data.week} starts after the ${sprint.lengthDays}-day sprint ends`,
      );
    }
  }
}

/** A log entry must reference a declared project/sprint and match its file path. */
function checkLog(
  log: CollectionEntry<'logs'>,
  projects: CollectionEntry<'projects'>[],
  retros: Set<string>,
  problems: string[],
): void {
  const project = projects.find((p) => p.id === log.data.project.id);
  if (!project) {
    problems.push(`${log.id}: references unknown project '${log.data.project.id}'`);
    return;
  }
  // A live log page under a draft project would carry breadcrumb and nav links
  // to a project page that prod builds never emit.
  if (!log.data.draft && project.data.draft) {
    problems.push(`${log.id}: published log references draft project '${project.id}'`);
  }
  checkLogSprint(log, project, problems);
  const [projectPart, filePart] = log.id.split('/');
  if (projectPart !== log.data.project.id) {
    problems.push(
      `${log.id}: file lives under '${projectPart}' but references '${log.data.project.id}'`,
    );
  }
  checkLogFilename(log, filePart, problems);
  if (log.data.kind === 'retro') {
    const key = `${log.data.project.id}#${log.data.sprint}`;
    if (retros.has(key)) problems.push(`duplicate retro for ${key}`);
    retros.add(key);
  }
}

/** Warn (not fail): a sprint with an outcome should have a retrospective. */
function warnOrphanedOutcomes(projects: CollectionEntry<'projects'>[], retros: Set<string>): void {
  for (const p of projects) {
    for (const s of p.data.sprints) {
      if (s.outcome && !retros.has(`${p.id}#${s.number}`)) {
        console.warn(
          `[content] warn: ${p.id} sprint ${s.number} has an outcome but no retro entry`,
        );
      }
    }
  }
}

/**
 * Build-time integrity rules that span entries. Throwing here fails
 * `astro build`, which is the CI gate. Warnings log but do not fail.
 */
export async function assertContentIntegrity(): Promise<void> {
  const projects = await getCollection('projects');
  const logs = await getCollection('logs');
  const posts = await getCollection('posts');

  const problems: string[] = [];
  checkSlugs(projects, 'project', problems);
  checkSlugs(posts, 'post', problems);
  checkFeaturedCap(projects, problems);

  const retros = new Set<string>();
  for (const log of logs) checkLog(log, projects, retros, problems);
  warnOrphanedOutcomes(projects, retros);

  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n- ${problems.join('\n- ')}`);
  }
}
