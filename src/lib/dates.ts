// Date formatting for the mono metadata voice. All formatting reads UTC parts —
// frontmatter dates parse to UTC midnight, and this keeps output timezone-proof.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `JUL 06` */
export function fmtMono(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}`;
}

/** `JUL 06 – AUG 05 2026` */
export function fmtRange(start: Date, end: Date): string {
  return `${fmtMono(start)} – ${fmtMono(end)} ${end.getUTCFullYear()}`;
}

/** `2026-07-06` */
export function fmtISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** `July 6, 2026` */
export function fmtLong(d: Date): string {
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
