// Layout math for the CareerGraph SVG. Pure math, kept out of the component so
// vitest can pin the year-slotting, tick placement, and branch connections.
// Experiences slot in by year ascending, then by their order in
// src/data/career.ts; every experience gets an equal-width slot, so a year with
// more experiences claims a wider band. Side projects branch off (and optionally
// merge back into) any node, wired by id.
import type { CareerNode } from '../data/career';
import { LABEL_CHAR_W } from './svg-label';

/** Vertical offset of a base-row label from its lane. */
const MAIN_LABEL_GAP = 30;
const SIDE_LABEL_GAP = 22;
/** Vertical distance between stacked label rows. */
const LABEL_ROW_STEP = 18;
/** Minimum horizontal gap before two labels are treated as colliding. */
const LABEL_MIN_GAP = 8;

export interface CareerGeometry {
  /** x of the left edge of the experience band (the first year's tick). */
  x0: number;
  /** x of the right edge of the experience band. */
  x1: number;
  /** y of the main career lane. */
  mainY: number;
  /** y of the side-project branch lane. */
  sideY: number;
}

export interface PlacedNode extends CareerNode {
  x: number;
  y: number;
  labelY: number;
}

export interface YearTick {
  year: string;
  /** x of the tick, at the left edge of that year's band of experiences. */
  x: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Connector {
  from: Point;
  to: Point;
  /** 'branch' peels a project off its parent; 'merge' folds it back in. */
  kind: 'branch' | 'merge';
}

export interface CareerLayout {
  mains: PlacedNode[];
  sides: PlacedNode[];
  years: YearTick[];
  connectors: Connector[];
}

/** Orders by year ascending, keeping the file order of same-year experiences. */
function orderByYear(nodes: CareerNode[]): CareerNode[] {
  return nodes
    .map((node, index) => ({ node, index }))
    .sort((a, b) => Number(a.node.year) - Number(b.node.year) || a.index - b.index)
    .map((entry) => entry.node);
}

/** One tick per distinct year, at the left edge of that year's band. */
function yearTicks(ordered: CareerNode[], x0: number, slot: number): YearTick[] {
  const ticks: YearTick[] = [];
  ordered.forEach((node, index) => {
    if (index === 0 || node.year !== ordered[index - 1].year) {
      ticks.push({ year: node.year, x: x0 + index * slot });
    }
  });
  return ticks;
}

/**
 * Assigns each label a vertical row so labels sharing a row never overlap.
 * Walks left to right and drops a label onto the nearest row (offset `rowStep`
 * from `baseY`) whose previous label has cleared, so a label only moves off the
 * base row when it would actually collide with a neighbor.
 */
function withRowLabels(nodes: PlacedNode[], baseY: number, rowStep: number): PlacedNode[] {
  const rowEnds: number[] = [];
  return nodes.map((node) => {
    const half = (node.label.length * LABEL_CHAR_W) / 2;
    let row = 0;
    while (row < rowEnds.length && rowEnds[row] > node.x - half - LABEL_MIN_GAP) {
      row += 1;
    }
    rowEnds[row] = node.x + half;
    return { ...node, labelY: baseY + row * rowStep };
  });
}

function point(node: PlacedNode): Point {
  return { x: node.x, y: node.y };
}

/** Indexes placed nodes by id, rejecting duplicate ids. */
function indexById(nodes: PlacedNode[]): Map<string, PlacedNode> {
  const byId = new Map<string, PlacedNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new Error(`Duplicate career node id '${node.id}'.`);
    }
    byId.set(node.id, node);
  }
  return byId;
}

/** Looks up a referenced node, failing loudly on a dangling id. */
function requireNode(
  byId: Map<string, PlacedNode>,
  id: string,
  field: 'from' | 'into',
  owner: string,
): PlacedNode {
  const node = byId.get(id);
  if (!node) {
    throw new Error(`Side project '${owner}' has ${field}: '${id}', which is not a known node id.`);
  }
  return node;
}

/** The most recent main-lane role before `index` — a side project's default parent. */
function precedingMain(placed: PlacedNode[], index: number, owner: string): PlacedNode {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (placed[cursor].lane === 'main') {
      return placed[cursor];
    }
  }
  throw new Error(`Side project '${owner}' has no earlier main role to branch from; add a 'from'.`);
}

/** One branch connector per side project, plus a merge connector where `into` is set. */
function branchConnectors(placed: PlacedNode[], byId: Map<string, PlacedNode>): Connector[] {
  const connectors: Connector[] = [];
  placed.forEach((node, index) => {
    if (node.lane !== 'side') {
      return;
    }
    const parent = node.from
      ? requireNode(byId, node.from, 'from', node.id)
      : precedingMain(placed, index, node.id);
    connectors.push({ from: point(parent), to: point(node), kind: 'branch' });
    if (node.into) {
      const target = requireNode(byId, node.into, 'into', node.id);
      connectors.push({ from: point(node), to: point(target), kind: 'merge' });
    }
  });
  return connectors;
}

/**
 * Computes SVG positions for the career graph: where each experience dot sits,
 * where its label goes, the year ticks, and the branch/merge connectors between
 * side projects and their parent nodes. Positioning is driven entirely by the
 * data, so editing history never touches geometry.
 */
export function layoutCareer(nodes: CareerNode[], geometry: CareerGeometry): CareerLayout {
  const ordered = orderByYear(nodes);
  const count = ordered.length;
  const slot = count > 0 ? (geometry.x1 - geometry.x0) / count : 0;

  const placed: PlacedNode[] = ordered.map((node, index) => {
    const x = geometry.x0 + (index + 0.5) * slot;
    const y = node.lane === 'side' ? geometry.sideY : geometry.mainY;
    return { ...node, x, y, labelY: y };
  });

  return {
    mains: withRowLabels(
      placed.filter((node) => node.lane === 'main'),
      geometry.mainY + MAIN_LABEL_GAP,
      LABEL_ROW_STEP,
    ),
    sides: withRowLabels(
      placed.filter((node) => node.lane === 'side'),
      geometry.sideY - SIDE_LABEL_GAP,
      -LABEL_ROW_STEP,
    ),
    years: yearTicks(ordered, geometry.x0, slot),
    connectors: branchConnectors(placed, indexById(placed)),
  };
}
