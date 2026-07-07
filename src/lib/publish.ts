// Pure scheduled-publishing predicate, kept framework-free so vitest can cover
// it (content.ts imports astro:content and can't be unit-tested directly).
//
// Frontmatter dates parse to UTC midnight; comparing them to the raw clock
// would publish "tomorrow's" post at 00:00 UTC — early evening in the author's
// timezone. Instead we compare calendar days in the site's configured timezone:
// a post dated 2026-07-05 goes live at local midnight on July 5.

/** `2026-07-05` for `now` as seen in `timeZone` (en-CA locale is ISO-shaped). */
function localDay(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** True once the calendar day in `timeZone` has reached the entry's date. */
export function isDatePublished(date: Date, now: Date, timeZone: string): boolean {
  const entryDay = date.toISOString().slice(0, 10);
  return entryDay <= localDay(now, timeZone);
}
