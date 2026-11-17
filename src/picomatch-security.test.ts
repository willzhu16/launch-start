import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
for (const version of ['2.3.2', '4.0.7']) {
  const entry = readdirSync('node_modules/.pnpm').find(
    (name) => name.startsWith(`picomatch@${version}`) && name.includes('patch_hash='),
  );
  if (!entry) throw new Error(`Missing patched picomatch ${version}`);
  const modulePath = resolve('node_modules/.pnpm', entry, 'node_modules/picomatch');
  const picomatch = require(modulePath);
  describe(`picomatch ${version} security patch`, () => {
    for (const pattern of ['+(*)', '+(*a)', '*(a*)', '+(?*a)', '+(*(a))']) {
      it(`literalizes risky repeated pattern ${pattern}`, () => {
        // Isolate regex execution so a regression cannot hang the test runner.
        const result = spawnSync(
          process.execPath,
          [
            '-e',
            'const match = require(process.argv[1])(process.argv[2]); console.log(JSON.stringify([match(process.argv[2]), match("a".repeat(100) + "!")]));',
            modulePath,
            pattern,
          ],
          { encoding: 'utf8', timeout: 2000 },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual([true, false]);
      });
    }
    it('preserves ordinary file globs and bounded repeated alternatives', () => {
      expect(picomatch('**/*.md')('content/project.md')).toBe(true);
      expect(picomatch('**/*.{ts,tsx}')('src/index.ts')).toBe(true);
      expect(picomatch('+(a|b)')('abba')).toBe(true);
      expect(picomatch('@(foo|bar).js')('foo.js')).toBe(true);
    });
  });
}
