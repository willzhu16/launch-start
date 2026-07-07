# launch-start

The build-in-public platform behind Launch Start: timed project sprints,
weekly build logs, and a permanent archive of shipped work. 100% static
(Astro + MDX), deployed to Cloudflare's free edge tier, $0 steady state.

This repo is the site itself: content, build, and deploy config.

## Stack

Astro 7 + MDX content collections · TypeScript · pnpm · Biome · Vitest ·
Cloudflare Workers static assets (wrangler).

## Develop

```sh
pnpm install
pnpm dev        # localhost:4321 — drafts visible, marked DRAFT
pnpm build      # prod build: drafts excluded, content integrity enforced
pnpm test       # vitest (sprint math)
pnpm check      # astro check + biome
```

## Write

Content is MDX in `src/content/` validated by `src/content.config.ts`
(scaffold scripts `pnpm new:*` arrive in Phase 1):

| What | Where | Notes |
|---|---|---|
| Project | `src/content/projects/<slug>/index.mdx` | H2 sections: What & why · Architecture · Outcome. Cover image required once status ≠ `idea` |
| Weekly log | `src/content/logs/<project>/s<sprint>-w<week 2-digit>.mdx` | Frontmatter arrays render the "Week at a glance" card; body is free-form story |
| Retro | `src/content/logs/<project>/s<sprint>-retro.mdx` | `kind: 'retro'`; sprint timeline auto-generates |
| Blog post | `src/content/posts/<slug>.mdx` | |

Publish = flip `draft: false`, push to main. Slugs are immutable after
first publish. Tech/tags must exist in `src/data/vocab.ts`.

## Configuration

All identity lives in `src/data/site.ts`: origin, socials, timezone
(scheduled posts go live at local midnight there), Buttondown username, home
media slot. `SITE_ORIGIN` env overrides the origin at deploy; nothing else in
the repo may hardcode a domain.

Other config surfaces:

- `src/data/project-logos.ts` — per-project square icons (public/icons/…),
  shown beside projects in the blog tree and drifting through the masthead
  ribbon. Projects without an entry fall back to a monogram.
- `src/data/career.ts` — the /about commit-graph timeline.
- `src/data/external-work.ts` — pre–Launch-Start repos shown on /about.
- `src/assets/avatar.webp` — the /about photo (static import; the build fails
  if it's missing). `public/resume.pdf` — About's Resume button appears only
  while this file exists.

Currently unset (fill in as they exist): YouTube URL,
`buttondownUsername` (subscribe forms render nothing until set).

## Deploy

`deploy.yml` builds and runs `wrangler deploy` on push to main, on a daily
cron (refreshes the sprint day counter), and manually. Needs repo secrets
`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. First-time setup: create
the Worker by running `pnpm build && pnpm dlx wrangler deploy` once locally.

## Not yet (by design)

Sync scripts + GitHub/YouTube panels-with-data (Phase 1) · scaffold scripts
(Phase 1) · generated per-page OG cards (Phase 1) · search (Phase 2) ·
dark mode (Phase 2) · syndication (Phase 3). See the roadmap in the design
repo.