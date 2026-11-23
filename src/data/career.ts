// Data for the /about career git-graph. Edits here never
// touch SVG geometry — the CareerGraph component computes positions.
export interface CareerNode {
  /** Stable slug other nodes reference via `from`/`into`. Rename labels freely. */
  id: string;
  year: string;
  label: string;
  /** 'sub' is a project that grew out of a side project, drawn on its own lane above it. */
  lane: 'main' | 'side' | 'sub';
  /**
   * Side and sub projects only: id of the node this project branches off. Side
   * projects default to the most recent main role before them; sub projects must set it.
   */
  from?: string;
  /**
   * Side and sub projects only: id of the node this project merges back into (its
   * skills folding forward). An earlier node means merging back into that node's
   * ongoing line, just after this project. Omit to leave the branch open.
   */
  into?: string;
}

export const career: CareerNode[] = [
  { id: 'uw', year: '2025', label: 'UW-Madison B.S. CS', lane: 'main' },
  { id: 'swe', year: '2025', label: 'SWE @ Northwestern Mutual', lane: 'main' },
  { id: 'nuu', year: '2025', label: 'NUU Mobile AI', lane: 'side', from: 'swe' },
  { id: 'contextguard', year: '2026', label: 'ContextGuard', lane: 'side', from: 'nuu' },
  {
    id: 'launchstart',
    year: '2026',
    label: 'Launch Start',
    lane: 'side',
    from: 'contextguard',
  },
  {
    id: 'beyondthescore',
    year: '2026',
    label: 'Beyond the Score',
    lane: 'sub',
    from: 'nuu',
    into: 'nuu',
  },
  { id: 'duckie', year: '2026', label: 'Duckie', lane: 'side', from: 'launchstart' },
];
