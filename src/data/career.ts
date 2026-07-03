// Data for the /about career git-graph (L-22, spec 02 §5.12). Edits here never
// touch SVG geometry — the CareerGraph component computes positions.
// PLACEHOLDER entries below mirror the v0.5 mockup — replace with real history.
export interface CareerNode {
  year: string;
  label: string;
  lane: 'main' | 'side';
  merge?: boolean;
}

export const career: CareerNode[] = [
  { year: '2022', label: 'B.S. CS', lane: 'main' },
  { year: '2023', label: 'SWE @ Company', lane: 'main' },
  { year: '2026', label: 'Side Project', lane: 'side' },
  { year: '2026', label: 'Launch Start', lane: 'side', merge: true },
];
