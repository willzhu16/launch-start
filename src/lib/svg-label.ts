// Label placement for the CareerGraph SVG. Pure math, kept out of the
// component so vitest can pin the edge-clamping behavior.

/**
 * Estimated advance per character for the 11px mono labels: JetBrains Mono's
 * ~0.6em glyph advance (6.6px) plus the 0.08em letter-spacing (0.88px).
 */
export const LABEL_CHAR_W = 7.5;

/** Minimum gap between a label and the viewBox edge. */
export const LABEL_PAD = 6;

export interface PlacedLabel {
  x: number;
  anchor: 'start' | 'middle' | 'end';
}

/**
 * Keeps a centered label inside `[0, width]`: a label whose estimated width
 * would clip at either edge is re-anchored to that edge instead.
 */
export function placeLabel(x: number, text: string, width: number): PlacedLabel {
  const half = (text.length * LABEL_CHAR_W) / 2;
  if (x - half < LABEL_PAD) return { x: LABEL_PAD, anchor: 'start' };
  if (x + half > width - LABEL_PAD) return { x: width - LABEL_PAD, anchor: 'end' };
  return { x, anchor: 'middle' };
}
