import { describe, expect, it } from 'vitest';
import { isDatePublished } from './publish';

const TZ = 'America/Chicago';

// Frontmatter dates parse to UTC midnight, same as z.coerce.date() on 'YYYY-MM-DD'.
const post = (day: string) => new Date(`${day}T00:00:00Z`);

describe('isDatePublished', () => {
  it('publishes a past date', () => {
    expect(isDatePublished(post('2026-07-01'), new Date('2026-07-03T15:00:00Z'), TZ)).toBe(true);
  });

  it('publishes on the date itself (local afternoon)', () => {
    // 2026-07-05 20:00 UTC = 3pm CDT on July 5.
    expect(isDatePublished(post('2026-07-05'), new Date('2026-07-05T20:00:00Z'), TZ)).toBe(true);
  });

  it('does not publish early when UTC has rolled over but local has not', () => {
    // 2026-07-05 01:00 UTC = 8pm CDT on July 4 — still July 4 in Chicago.
    expect(isDatePublished(post('2026-07-05'), new Date('2026-07-05T01:00:00Z'), TZ)).toBe(false);
  });

  it('publishes at local midnight, not UTC midnight', () => {
    // 2026-07-05 05:00 UTC = 12:00am CDT on July 5 — the local day has arrived.
    expect(isDatePublished(post('2026-07-05'), new Date('2026-07-05T05:00:00Z'), TZ)).toBe(true);
  });

  it('does not publish a clearly future date', () => {
    expect(isDatePublished(post('2026-08-01'), new Date('2026-07-03T15:00:00Z'), TZ)).toBe(false);
  });

  it('respects the configured timezone (UTC publishes sooner than Chicago)', () => {
    const now = new Date('2026-07-05T01:00:00Z');
    expect(isDatePublished(post('2026-07-05'), now, 'UTC')).toBe(true);
    expect(isDatePublished(post('2026-07-05'), now, TZ)).toBe(false);
  });
});
