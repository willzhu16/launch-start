import { describe, expect, it } from 'vitest';
import { fmtISO, fmtLong, fmtMono, fmtRange, groupByYear } from './dates';

// Frontmatter dates parse to UTC midnight, so every expectation below is UTC-based.
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('fmtMono', () => {
  it('renders the uppercase month and zero-padded day', () => {
    expect(fmtMono(utc('2026-07-06'))).toBe('JUL 06');
  });
});

describe('fmtISO', () => {
  it('renders a zero-padded YYYY-MM-DD string', () => {
    expect(fmtISO(utc('2026-07-06'))).toBe('2026-07-06');
  });
});

describe('fmtRange', () => {
  it('renders start and end months with the end year', () => {
    expect(fmtRange(utc('2026-07-06'), utc('2026-08-05'))).toBe('JUL 06 – AUG 05 2026');
  });
});

describe('fmtLong', () => {
  it('renders the long month, un-padded day, and year', () => {
    expect(fmtLong(utc('2026-07-06'))).toBe('July 6, 2026');
  });
});

describe('groupByYear', () => {
  const item = (id: string, iso: string) => ({ id, date: utc(iso) });
  const byDate = (entry: { date: Date }) => entry.date;

  it('orders groups newest year first', () => {
    const groups = groupByYear([item('a', '2024-01-01'), item('b', '2026-01-01')], byDate);
    expect(groups.map((group) => group.year)).toEqual([2026, 2024]);
  });

  it('preserves input order within a year', () => {
    const items = [item('a', '2026-01-01'), item('b', '2026-08-01'), item('c', '2026-04-01')];
    const groups = groupByYear(items, byDate);
    expect(groups[0].items.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty array for empty input', () => {
    expect(groupByYear([], byDate)).toEqual([]);
  });

  it('returns a single group when every item shares a year', () => {
    const groups = groupByYear([item('a', '2026-01-01'), item('b', '2026-09-01')], byDate);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      year: 2026,
      items: [item('a', '2026-01-01'), item('b', '2026-09-01')],
    });
  });
});
