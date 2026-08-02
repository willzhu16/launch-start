import { describe, expect, it } from 'vitest';
import { escapeXml, ogCardSvg, wrapTitle } from './og-card';

describe('wrapTitle', () => {
  it('keeps a short title on one line', () => {
    expect(wrapTitle('Launch Start')).toEqual(['Launch Start']);
  });

  it('wraps a real log title without splitting words', () => {
    const lines = wrapTitle('Week 3 — The Shelf Gets a Neighbor');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('Week 3 — The Shelf Gets a Neighbor');
  });

  it('cuts an over-long title at the line cap with an ellipsis', () => {
    const lines = wrapTitle('word '.repeat(40).trim(), 10, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith('…')).toBe(true);
  });

  it('collapses repeated whitespace between words', () => {
    expect(wrapTitle('Launch   Start')).toEqual(['Launch Start']);
  });
});

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`Fish & <chips> "n" 'peas'`)).toBe(
      'Fish &amp; &lt;chips&gt; &quot;n&quot; &apos;peas&apos;',
    );
  });
});

describe('ogCardSvg', () => {
  const card = { kicker: 'BLOG · JUL 20 2026', title: 'Why & <how>', footer: 'willzhu.dev' };

  it('embeds kicker, escaped title, and footer', () => {
    const svg = ogCardSvg(card);
    expect(svg).toContain('BLOG · JUL 20 2026');
    expect(svg).toContain('Why &amp; &lt;how&gt;');
    expect(svg).toContain('willzhu.dev');
  });

  it('renders at the 1200x630 Open Graph size', () => {
    expect(ogCardSvg(card)).toContain("width='1200' height='630'");
  });
});
