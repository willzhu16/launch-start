// Data for the /about career git-graph. Edits here never
// touch SVG geometry — the CareerGraph component computes positions.
export interface CareerNode {
  /** Stable slug other nodes reference via `from`/`into`. Rename labels freely. */
  id: string;
  year: string;
  label: string;
  lane: 'main' | 'side';
  /**
   * Side projects only: id of the node this project branches off. Defaults to
   * the most recent main role before it in time.
   */
  from?: string;
  /**
   * Side projects only: id of the node this project merges back into (its
   * skills folding forward). Omit to leave the branch open, ending at its dot.
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
];
