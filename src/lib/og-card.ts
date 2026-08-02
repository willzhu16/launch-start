// SVG template for the per-page Open Graph cards, rasterized to PNG by
// src/pages/og/[...path].png.ts. Pure string building and width estimation,
// kept out of the endpoint so wrapping and escaping stay unit-testable.

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const MARGIN_X = 96;
const TITLE_SIZE = 68;
const TITLE_LINE_HEIGHT = 86;
const TITLE_FIRST_BASELINE = 286;
const TITLE_MAX_LINES = 3;
/** Usable title width in em at TITLE_SIZE. */
const TITLE_LIMIT_EM = (OG_WIDTH - 2 * MARGIN_X) / TITLE_SIZE;

/**
 * Estimated advance per Fraunces 600 glyph, in em — the svg-label.ts approach
 * of estimating instead of measuring, with three width classes since display
 * sizes make the narrow/wide spread visible.
 */
function charEm(char: string): number {
  if ("iljft.,:;!'’ ".includes(char)) return 0.3;
  if ('mwMW—@'.includes(char)) return 0.95;
  if (char !== char.toLowerCase()) return 0.72;
  return 0.52;
}

function textEm(text: string): number {
  let total = 0;
  for (const char of text) total += charEm(char);
  return total;
}

/**
 * Greedy word wrap by estimated width. Titles that would overflow maxLines
 * are cut at the last fitting word with an ellipsis.
 */
export function wrapTitle(
  title: string,
  limitEm = TITLE_LIMIT_EM,
  maxLines = TITLE_MAX_LINES,
): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textEm(candidate) > limitEm) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.includes(' ') && textEm(`${last} …`) > limitEm) {
    last = last.slice(0, last.lastIndexOf(' '));
  }
  kept[maxLines - 1] = `${last} …`;
  return kept;
}

/** XML-escapes text content for safe embedding in the SVG template. */
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export interface OgCard {
  /** Mono uppercase context line, e.g. `BLOG · JUL 20 2026`. */
  kicker: string;
  title: string;
  /** Mono bottom line, e.g. `William Zhu · willzhu.dev`. */
  footer: string;
}

/**
 * A 1200x630 card in the Warm Journal light palette: graph-paper ground,
 * pink accent bar, mono kicker and footer, Fraunces title.
 */
export function ogCardSvg(card: OgCard): string {
  const titleLines = wrapTitle(card.title)
    .map(
      (line, index) =>
        `<text x='${MARGIN_X}' y='${TITLE_FIRST_BASELINE + index * TITLE_LINE_HEIGHT}' ` +
        `font-family='Fraunces' font-weight='600' font-size='${TITLE_SIZE}' ` +
        `fill='#2e2820'>${escapeXml(line)}</text>`,
    )
    .join('\n  ');
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${OG_WIDTH}' height='${OG_HEIGHT}'>
  <defs>
    <pattern id='grid' width='32' height='32' patternUnits='userSpaceOnUse'>
      <path d='M32 0H0V32' fill='none' stroke='rgba(122, 86, 56, 0.09)' stroke-width='1'/>
    </pattern>
  </defs>
  <rect width='${OG_WIDTH}' height='${OG_HEIGHT}' fill='#fbf5ea'/>
  <rect width='${OG_WIDTH}' height='${OG_HEIGHT}' fill='url(#grid)'/>
  <rect width='${OG_WIDTH}' height='14' fill='#d9538f'/>
  <text x='${MARGIN_X}' y='176' font-family='JetBrains Mono' font-size='26' letter-spacing='4'
    fill='#8e2e5b'>${escapeXml(card.kicker)}</text>
  ${titleLines}
  <text x='${MARGIN_X}' y='560' font-family='JetBrains Mono' font-size='24'
    fill='#6e6353'>${escapeXml(card.footer)}</text>
</svg>`;
}
