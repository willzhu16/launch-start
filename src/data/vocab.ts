// Controlled vocabulary. Lowercase kebab-case keys; extending the
// vocab is a deliberate one-line diff — the build fails on anything not listed.
export const vocab = {
  tech: [
    'astro',
    'typescript',
    'react',
    'node',
    'python',
    'cloudflare-workers',
    'github-actions',
    'postgres',
    'vitest',
  ],
  tags: ['platform', 'meta', 'ai', 'devops', 'security', 'web', 'tooling', 'writing'],
} as const;

export type Tech = (typeof vocab.tech)[number];
export type Tag = (typeof vocab.tags)[number];

// Display names for chips and labels; keys without an entry render as-is.
export const labels: Record<string, string> = {
  astro: 'Astro',
  typescript: 'TypeScript',
  react: 'React',
  node: 'Node.js',
  python: 'Python',
  'cloudflare-workers': 'Cloudflare Workers',
  'github-actions': 'GitHub Actions',
  postgres: 'Postgres',
  vitest: 'Vitest',
  platform: 'platform',
  meta: 'meta',
  ai: 'AI',
  devops: 'DevOps',
  security: 'security',
  web: 'web',
  tooling: 'tooling',
  writing: 'writing',
};

export function labelFor(key: string): string {
  return labels[key] ?? key;
}
