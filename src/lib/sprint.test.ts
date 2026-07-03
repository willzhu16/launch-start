import { describe, expect, it } from 'vitest';
import {
  activeSprint,
  type Sprint,
  sprintDay,
  sprintEnded,
  sprintProgress,
  upcomingSprint,
} from './sprint';

function makeSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    number: 1,
    goal: 'Ship the site.',
    lengthDays: 30,
    startDate: new Date('2026-07-06'),
    endDate: new Date('2026-08-05'),
    ...overrides,
  };
}

describe('sprintDay', () => {
  it('is null before the sprint starts', () => {
    expect(sprintDay(makeSprint(), new Date('2026-07-05'))).toBeNull();
  });

  it('is 1 on the start date', () => {
    expect(sprintDay(makeSprint(), new Date('2026-07-06'))).toBe(1);
  });

  it('counts calendar days regardless of time of day', () => {
    expect(sprintDay(makeSprint(), new Date('2026-07-17T23:59:00Z'))).toBe(12);
  });

  it('reaches lengthDays on the last day', () => {
    expect(sprintDay(makeSprint(), new Date('2026-08-04'))).toBe(30);
  });

  it('clamps to lengthDays after the end', () => {
    expect(sprintDay(makeSprint(), new Date('2026-12-25'))).toBe(30);
  });
});

describe('activeSprint / upcomingSprint', () => {
  const s1 = makeSprint();
  const s2 = makeSprint({
    number: 2,
    startDate: new Date('2026-09-01'),
    endDate: new Date('2026-10-01'),
  });
  const project = { sprints: [s1, s2] };

  it('finds the sprint containing today in a multi-sprint project', () => {
    expect(activeSprint(project, new Date('2026-07-10'))?.number).toBe(1);
    expect(activeSprint(project, new Date('2026-09-15'))?.number).toBe(2);
  });

  it('is null between sprints and before the first', () => {
    expect(activeSprint(project, new Date('2026-08-15'))).toBeNull();
    expect(activeSprint(project, new Date('2026-01-01'))).toBeNull();
  });

  it('includes both boundary days', () => {
    expect(activeSprint(project, new Date('2026-07-06'))?.number).toBe(1);
    expect(activeSprint(project, new Date('2026-08-05'))?.number).toBe(1);
  });

  it('upcomingSprint returns the earliest future sprint', () => {
    expect(upcomingSprint(project, new Date('2026-08-15'))?.number).toBe(2);
    expect(upcomingSprint(project, new Date('2026-10-02'))).toBeNull();
  });

  it('a sprint starting today is active, not upcoming', () => {
    expect(upcomingSprint(project, new Date('2026-07-06'))?.number).toBe(2);
    expect(activeSprint(project, new Date('2026-07-06'))?.number).toBe(1);
  });
});

describe('sprintProgress', () => {
  it('is null before the start', () => {
    expect(sprintProgress(makeSprint(), new Date('2026-07-01'))).toBeNull();
  });

  it('computes day and rounded percent', () => {
    expect(sprintProgress(makeSprint(), new Date('2026-07-17'))).toEqual({ day: 12, pct: 40 });
  });

  it('caps at 100 percent after the end', () => {
    expect(sprintProgress(makeSprint(), new Date('2026-09-01'))).toEqual({ day: 30, pct: 100 });
  });
});

describe('sprintEnded', () => {
  it('is false on the last day and true after it', () => {
    expect(sprintEnded(makeSprint(), new Date('2026-08-05'))).toBe(false);
    expect(sprintEnded(makeSprint(), new Date('2026-08-06'))).toBe(true);
  });
});
