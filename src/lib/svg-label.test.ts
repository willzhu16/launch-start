import { describe, expect, it } from 'vitest';
import { career } from '../data/career';
import { LABEL_CHAR_W, LABEL_PAD, placeLabel } from './svg-label';

const WIDTH = 800;

describe('placeLabel', () => {
  it('centers a label that fits well inside the viewBox', () => {
    expect(placeLabel(400, 'hi', WIDTH)).toEqual({ x: 400, anchor: 'middle' });
  });

  it('clamps to the left edge when the label would clip the start', () => {
    expect(placeLabel(2, 'hello', WIDTH)).toEqual({ x: LABEL_PAD, anchor: 'start' });
  });

  it('clamps to the right edge when the label would clip the end', () => {
    expect(placeLabel(799, 'hello', WIDTH)).toEqual({ x: WIDTH - LABEL_PAD, anchor: 'end' });
  });

  it('stays centered when the left edge lands exactly on LABEL_PAD', () => {
    const half = ('hi'.length * LABEL_CHAR_W) / 2;
    const x = LABEL_PAD + half;
    expect(placeLabel(x, 'hi', WIDTH)).toEqual({ x, anchor: 'middle' });
  });

  it('clamps once the left edge crosses just inside LABEL_PAD', () => {
    const half = ('hi'.length * LABEL_CHAR_W) / 2;
    const x = LABEL_PAD + half - 0.1;
    expect(placeLabel(x, 'hi', WIDTH)).toEqual({ x: LABEL_PAD, anchor: 'start' });
  });
});

describe('placeLabel with real career labels', () => {
  // Plausible node x-coordinates spanning the graph, including both extremes.
  const nodePositions = [0, 120, 240, 400, 560, 680, WIDTH];

  for (const node of career) {
    const text = node.label;
    it(`keeps "${text}" within [0, ${WIDTH}] at every node position`, () => {
      for (const x of nodePositions) {
        const placed = placeLabel(x, text, WIDTH);
        expect(placed.x).toBeGreaterThanOrEqual(0);
        expect(placed.x).toBeLessThanOrEqual(WIDTH);
      }
    });
  }
});
