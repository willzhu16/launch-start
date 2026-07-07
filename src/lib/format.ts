// Tiny presentation formatters shared across components.

/** Up-to-two-letter monogram from a title's word initials (`General Writing` → `GW`). */
export function initials(title: string): string {
  return title
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
}
