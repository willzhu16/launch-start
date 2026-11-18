import { describe, expect, it } from 'vitest';
import type { CareerNode } from '../data/career';
import { type CareerGeometry, connectorPath, layoutCareer } from './career-graph';

// Round numbers keep the slot math easy to reason about: 5 slots, slot width 20.
const geometry: CareerGeometry = { x0: 0, x1: 100, mainY: 160, sideY: 82, subY: 30 };

const nodes: CareerNode[] = [
  { id: 'grad', year: '2025', label: 'Grad', lane: 'main' },
  { id: 'job', year: '2025', label: 'Job', lane: 'main' },
  { id: 'a', year: '2025', label: 'Side A', lane: 'side', from: 'job' },
  { id: 'b', year: '2026', label: 'Side B', lane: 'side', from: 'a' },
  { id: 'c', year: '2026', label: 'Side C', lane: 'side', from: 'b', into: 'job' },
];

describe('layoutCareer', () => {
  it('centers each experience in an equal-width slot across the axis', () => {
    const { mains, sides } = layoutCareer(nodes, geometry);
    expect(mains.map((node) => node.x)).toEqual([10, 30]);
    expect(sides.map((node) => node.x)).toEqual([50, 70, 90]);
  });

  it('places each lane at its own y', () => {
    const { mains, sides } = layoutCareer(nodes, geometry);
    expect(mains.every((node) => node.y === geometry.mainY)).toBe(true);
    expect(sides.every((node) => node.y === geometry.sideY)).toBe(true);
  });

  it('puts each year tick at the left edge of its band, sized by experience count', () => {
    // 2025 owns three of five slots, so 2026 opens 60% of the way across — the
    // 3:2 experience split becomes a 3:2 band-width split.
    const { years } = layoutCareer(nodes, geometry);
    expect(years).toEqual([
      { year: '2025', x: 0 },
      { year: '2026', x: 60 },
    ]);
  });

  it('orders by year first, then by file order within a year', () => {
    const shuffled: CareerNode[] = [
      { id: 'late', year: '2026', label: 'Late', lane: 'main' },
      { id: 'second', year: '2025', label: 'Second', lane: 'main' },
      { id: 'first', year: '2025', label: 'First', lane: 'main' },
    ];
    const { mains } = layoutCareer(shuffled, geometry);
    expect(mains.map((node) => node.label)).toEqual(['Second', 'First', 'Late']);
    expect(mains[0].x).toBeLessThan(mains[2].x);
  });

  it('keeps well-separated labels on the base row (no needless stagger)', () => {
    const spaced: CareerNode[] = [
      { id: 'x', year: '2025', label: 'A', lane: 'side', from: 'x' },
      { id: 'y', year: '2026', label: 'B', lane: 'side', from: 'x' },
      { id: 'z', year: '2027', label: 'C', lane: 'side', from: 'y' },
    ];
    const wide: CareerGeometry = { x0: 0, x1: 900, mainY: 160, sideY: 82, subY: 30 };
    const { sides } = layoutCareer(spaced, wide);
    expect(sides.map((node) => node.labelY)).toEqual([60, 60, 60]);
  });

  it('stacks only the labels that would overlap onto further rows', () => {
    // The fixture's three side labels are packed into 20px-wide slots, so each
    // collides with the last and steps one row further from the lane.
    const { sides } = layoutCareer(nodes, geometry);
    expect(sides.map((node) => node.labelY)).toEqual([60, 42, 24]);
  });

  it('stacks colliding main-lane labels below the timeline', () => {
    const { mains } = layoutCareer(nodes, geometry);
    expect(mains.map((node) => node.labelY)).toEqual([190, 208]);
  });

  it('centers a lone experience and starts its year at the band edge', () => {
    const { mains, years } = layoutCareer(
      [{ id: 'only', year: '2025', label: 'Only', lane: 'main' }],
      geometry,
    );
    expect(mains[0].x).toBe(50);
    expect(years).toEqual([{ year: '2025', x: 0 }]);
  });

  it('returns empty structures for no experiences', () => {
    expect(layoutCareer([], geometry)).toEqual({
      mains: [],
      sides: [],
      subs: [],
      years: [],
      connectors: [],
    });
  });
});

describe('layoutCareer branch connections', () => {
  it('branches each side project off its `from` node and merges on `into`', () => {
    const { connectors } = layoutCareer(nodes, geometry);
    expect(connectors).toEqual([
      { from: { x: 30, y: 160 }, to: { x: 50, y: 82 }, kind: 'branch' }, // a from job
      { from: { x: 50, y: 82 }, to: { x: 70, y: 82 }, kind: 'branch' }, // b from a
      { from: { x: 70, y: 82 }, to: { x: 90, y: 82 }, kind: 'branch' }, // c from b
      // Job is earlier than c, so c folds back into Job's ongoing lane half a slot after itself.
      { from: { x: 90, y: 82 }, to: { x: 100, y: 160 }, kind: 'merge' }, // c into job
    ]);
  });

  it('merges into a later node at that node itself', () => {
    const forward: CareerNode[] = [
      { id: 'job', year: '2025', label: 'Job', lane: 'main' },
      { id: 'proj', year: '2025', label: 'Proj', lane: 'side', from: 'job', into: 'next' },
      { id: 'next', year: '2026', label: 'Next', lane: 'main' },
    ];
    const { connectors } = layoutCareer(forward, geometry);
    expect(connectors[1].to.x).toBeCloseTo(250 / 3); // Next sits in the last of 3 slots
    expect(connectors[1].to.y).toBe(160);
  });

  it('puts a sub project on its own lane, off and back onto its parent line around itself', () => {
    const withSub: CareerNode[] = [
      { id: 'job', year: '2025', label: 'Job', lane: 'main' },
      { id: 'research', year: '2025', label: 'Research', lane: 'side', from: 'job' },
      { id: 'tool', year: '2026', label: 'Tool', lane: 'side', from: 'research' },
      { id: 'site', year: '2026', label: 'Site', lane: 'sub', from: 'research', into: 'research' },
      { id: 'later', year: '2026', label: 'Later', lane: 'side', from: 'tool' },
    ];
    const { sides, subs, connectors } = layoutCareer(withSub, geometry);
    expect(sides.map((node) => node.id)).toEqual(['research', 'tool', 'later']);
    expect(subs).toMatchObject([{ id: 'site', x: 70, y: 30, labelY: 8 }]);
    // Research is two slots back, so the branch leaves its line half a slot before Site.
    expect(connectors).toContainEqual({
      from: { x: 60, y: 82 },
      to: { x: 70, y: 30 },
      kind: 'branch',
    });
    expect(connectors).toContainEqual({
      from: { x: 70, y: 30 },
      to: { x: 80, y: 82 },
      kind: 'merge',
    });
  });

  it('throws when a sub project has no `from`', () => {
    const orphan: CareerNode[] = [
      { id: 'job', year: '2025', label: 'Job', lane: 'main' },
      { id: 'site', year: '2026', label: 'Site', lane: 'sub' },
    ];
    expect(() => layoutCareer(orphan, geometry)).toThrow(/Sub project 'site' needs a 'from'/);
  });

  it('defaults a side project with no `from` to the preceding main role', () => {
    const withDefault: CareerNode[] = [
      { id: 'grad', year: '2025', label: 'Grad', lane: 'main' },
      { id: 'job', year: '2026', label: 'Job', lane: 'main' },
      { id: 'proj', year: '2026', label: 'Proj', lane: 'side' },
    ];
    const { connectors } = layoutCareer(withDefault, geometry);
    // 3 slots, width 100/3: job at index 1, proj at index 2.
    expect(connectors).toHaveLength(1);
    expect(connectors[0].from.x).toBeCloseTo(50); // the Job node, not Grad
    expect(connectors[0].kind).toBe('branch');
  });

  it('throws when `from` names an unknown node id', () => {
    const bad: CareerNode[] = [
      { id: 'job', year: '2026', label: 'Job', lane: 'main' },
      { id: 'proj', year: '2026', label: 'Proj', lane: 'side', from: 'ghost' },
    ];
    expect(() => layoutCareer(bad, geometry)).toThrow(/ghost/);
  });

  it('throws when `into` names an unknown node id', () => {
    const bad: CareerNode[] = [
      { id: 'job', year: '2026', label: 'Job', lane: 'main' },
      { id: 'proj', year: '2026', label: 'Proj', lane: 'side', from: 'job', into: 'ghost' },
    ];
    expect(() => layoutCareer(bad, geometry)).toThrow(/ghost/);
  });

  it('throws on a duplicate node id', () => {
    const dupe: CareerNode[] = [
      { id: 'job', year: '2025', label: 'Job', lane: 'main' },
      { id: 'job', year: '2026', label: 'Job II', lane: 'main' },
    ];
    expect(() => layoutCareer(dupe, geometry)).toThrow(/[Dd]uplicate.*job/);
  });

  it('throws when a side project has no main role to branch from', () => {
    const orphan: CareerNode[] = [{ id: 'proj', year: '2026', label: 'Proj', lane: 'side' }];
    expect(() => layoutCareer(orphan, geometry)).toThrow(/branch from/);
  });
});

describe('connectorPath', () => {
  it('draws a same-lane run as one flat curve', () => {
    const path = connectorPath({ from: { x: 50, y: 82 }, to: { x: 210, y: 82 }, kind: 'branch' });
    expect(path).toBe('M 50 82 C 95 82, 165 82, 210 82');
  });

  it('draws a short lane change as a single curve that never overshoots', () => {
    const path = connectorPath({ from: { x: 0, y: 160 }, to: { x: 60, y: 82 }, kind: 'branch' });
    expect(path).toBe('M 0 160 C 30 160, 30 82, 60 82');
  });

  it('curves a long branch off its parent first, then runs flat to the project', () => {
    const path = connectorPath({ from: { x: 0, y: 82 }, to: { x: 200, y: 30 }, kind: 'branch' });
    expect(path).toBe('M 0 82 C 45 82, 45 30, 90 30 L 200 30');
  });

  it('runs a long merge flat first, then curves into its target', () => {
    const path = connectorPath({ from: { x: 100, y: 30 }, to: { x: 300, y: 82 }, kind: 'merge' });
    expect(path).toBe('M 100 30 L 210 30 C 255 30, 255 82, 300 82');
  });
});
