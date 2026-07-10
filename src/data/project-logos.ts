// The single per-project icon registry (identity is configuration).
// Keyed by project slug. Consumed in two places:
// - ProjectMark: the mark beside a project in the blog tree (missing id falls
//   back to a monogram, so this can stay sparse);
// - Masthead: the home ribbon of icons drifting behind the wordmark.
// Drop the file in public/icons/ and add one row per project.
export const projectLogos: Record<string, string> = {};
