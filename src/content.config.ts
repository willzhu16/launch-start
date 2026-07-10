import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { vocab } from './data/vocab';

const isoDate = z.coerce.date();

// 11-char YouTube video id, never a URL — sync resolves the rest.
const videoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'must be an 11-char YouTube video id');

const projectStatus = z.enum(['idea', 'in-sprint', 'shipped', 'paused', 'archived']);

const DAY_MS = 86_400_000;

const sprint = z
  .object({
    number: z.number().int().positive(),
    goal: z.string().max(200),
    lengthDays: z.number().int().min(7).max(180),
    startDate: isoDate,
    endDate: isoDate,
    outcome: z.string().max(300).optional(),
  })
  .refine(
    (s) => Math.round((s.endDate.getTime() - s.startDate.getTime()) / DAY_MS) === s.lengthDays - 1,
    { message: 'endDate must be the inclusive final day of the sprint' },
  );

function vocabList(kind: 'tech' | 'tags', max: number) {
  const list: readonly string[] = vocab[kind];
  return z
    .array(z.string())
    .max(max)
    .superRefine((values, ctx) => {
      const bad = values.filter((v) => !list.includes(v));
      if (bad.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown ${kind}: ${bad.join(', ')} — extend src/data/vocab.ts`,
        });
      }
    });
}

const techList = vocabList('tech', 8);
const tagList = vocabList('tags', 5);

const projects = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/\/index\.mdx$/, ''),
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(60),
        pitch: z.string().max(140),
        status: projectStatus,
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
        createdDate: isoDate,
        tech: techList,
        tags: tagList,
        repo: z
          .string()
          .regex(/^[\w.-]+\/[\w.-]+$/, "must be 'owner/name'")
          .optional(),
        demoUrl: z.url().optional(),
        videoId: videoId.optional(),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        sprints: z.array(sprint).default([]),
      })
      .refine((p) => p.status === 'idea' || p.cover !== undefined, {
        message: "cover is required once status !== 'idea'",
      })
      .refine((p) => p.cover === undefined || (p.coverAlt ?? '').length > 0, {
        message: 'coverAlt is required when cover is present',
      })
      .refine((p) => new Set(p.sprints.map((s) => s.number)).size === p.sprints.length, {
        message: 'sprint numbers must be unique per project',
      }),
});

const logs = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './src/content/logs' }),
  schema: z
    .object({
      project: reference('projects'),
      sprint: z.number().int().positive(),
      kind: z.enum(['week', 'retro']).default('week'),
      week: z.number().int().positive().optional(),
      title: z.string().max(80),
      date: isoDate,
      tldr: z.string().max(280),
      // "Week at a glance" — rendered as a card; the body stays free-form.
      shipped: z.array(z.string().max(120)).default([]),
      struggled: z.array(z.string().max(120)).default([]),
      learned: z.array(z.string().max(120)).default([]),
      days: z.array(z.object({ d: z.string().max(12), note: z.string().max(140) })).default([]),
      videoId: videoId.optional(),
      draft: z.boolean().default(false),
    })
    .refine((e) => e.kind !== 'week' || e.week !== undefined, {
      message: "week is required when kind is 'week'",
    })
    .refine((e) => e.kind !== 'retro' || e.week === undefined, {
      message: "week must be omitted when kind is 'retro'",
    }),
});

const posts = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().max(80),
    description: z.string().max(160),
    date: isoDate,
    updated: isoDate.optional(),
    tags: tagList,
    project: reference('projects').optional(),
    videoId: videoId.optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, logs, posts };
