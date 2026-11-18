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
  /** y of the lane for sub projects, which grow out of a side project. */
  subY: number;
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
  subs: PlacedNode[];
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

/** The node a side or sub project branches off. */
function branchParent(
  placed: PlacedNode[],
  index: number,
  byId: Map<string, PlacedNode>,
): PlacedNode {
  const node = placed[index];
  if (node.from) {
    return requireNode(byId, node.from, 'from', node.id);
  }
  if (node.lane === 'sub') {
    throw new Error(`Sub project '${node.id}' needs a 'from' naming the project it grew out of.`);
  }
  return precedingMain(placed, index, node.id);
}

// A lane-changing branch from a parent more than one slot back leaves the
// parent's line half a slot before the project, so it never climbs through the
// labels of the nodes in between. Merges into an earlier node mirror it.
function branchPoint(node: PlacedNode, parent: PlacedNode, slot: number): Point {
  const farBack = parent.x < node.x - slot - 0.001;
  return parent.y !== node.y && farBack ? { x: node.x - slot / 2, y: parent.y } : point(parent);
}

function mergePoint(node: PlacedNode, target: PlacedNode, slot: number): Point {
  return target.x > node.x ? point(target) : { x: node.x + slot / 2, y: target.y };
}

/** One branch connector per side or sub project, plus a merge connector where `into` is set. */
function branchConnectors(
  placed: PlacedNode[],
  byId: Map<string, PlacedNode>,
  slot: number,
): Connector[] {
  const connectors: Connector[] = [];
  placed.forEach((node, index) => {
    if (node.lane === 'main') {
      return;
    }
    const parent = branchParent(placed, index, byId);
    connectors.push({ from: branchPoint(node, parent, slot), to: point(node), kind: 'branch' });
    if (node.into) {
      const target = requireNode(byId, node.into, 'into', node.id);
      connectors.push({ from: point(node), to: mergePoint(node, target, slot), kind: 'merge' });
    }
  });
  return connectors;
}

function curveTo(from: Point, to: Point, reach: number): string {
  return `C ${from.x + reach} ${from.y}, ${to.x - reach} ${to.y}, ${to.x} ${to.y}`;
}

/**
 * SVG path for one connector, drawn the way a git graph reads: a branch curves
 * off its parent and then runs flat along its own lane, and a merge runs flat
 * and then curves into its target. Short spans and same-lane runs are a single
 * curve with horizontal handles, whose reach shrinks so it never overshoots.
 */
export function connectorPath(connector: Connector): string {
  const { from, to, kind } = connector;
  const span = Math.abs(to.x - from.x);
  const reach = Math.min(45, Math.max(14, span / 2));
  if (from.y === to.y || span <= 2 * reach) {
    return `M ${from.x} ${from.y} ${curveTo(from, to, reach)}`;
  }
  if (kind === 'branch') {
    const bend = { x: from.x + 2 * reach, y: to.y };
    return `M ${from.x} ${from.y} ${curveTo(from, bend, reach)} L ${to.x} ${to.y}`;
  }
  const bend = { x: to.x - 2 * reach, y: from.y };
  return `M ${from.x} ${from.y} L ${bend.x} ${bend.y} ${curveTo(bend, to, reach)}`;
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

  const laneY = { main: geometry.mainY, side: geometry.sideY, sub: geometry.subY };
  const placed: PlacedNode[] = ordered.map((node, index) => {
    const x = geometry.x0 + (index + 0.5) * slot;
    const y = laneY[node.lane];
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
    subs: withRowLabels(
      placed.filter((node) => node.lane === 'sub'),
      geometry.subY - SIDE_LABEL_GAP,
      -LABEL_ROW_STEP,
    ),
    years: yearTicks(ordered, geometry.x0, slot),
    connectors: branchConnectors(placed, indexById(placed), slot),
  };
}
