// Sprint/day-counter math. Pure functions — the home banner,
// SprintProgress, and OG cards all compute day numbers exactly here.
export interface Sprint {
  number: number;
  goal: string;
  lengthDays: number;
  startDate: Date;
  endDate: Date;
  outcome?: string | undefined;
}

const DAY_MS = 86_400_000;

// Calendar-date arithmetic: normalize to UTC midnight so the builder's clock
// time and timezone never shift a day boundary.
function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((utcMidnight(b) - utcMidnight(a)) / DAY_MS);
}

/** 1-based day number; null before the sprint starts; clamps to lengthDays after the end. */
export function sprintDay(sprint: Sprint, today: Date): number | null {
  const elapsed = daysBetween(sprint.startDate, today);
  if (elapsed < 0) return null;
  return Math.min(elapsed + 1, sprint.lengthDays);
}

/** The sprint whose window contains today, if any. */
export function activeSprint(project: { sprints: Sprint[] }, today: Date): Sprint | null {
  return (
    project.sprints.find(
      (s) => daysBetween(s.startDate, today) >= 0 && daysBetween(today, s.endDate) >= 0,
    ) ?? null
  );
}

/** The next sprint whose startDate is in the future, earliest first. */
export function upcomingSprint(project: { sprints: Sprint[] }, today: Date): Sprint | null {
  const future = project.sprints
    .filter((s) => daysBetween(today, s.startDate) > 0)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return future[0] ?? null;
}

export function sprintProgress(sprint: Sprint, today: Date): { day: number; pct: number } | null {
  const day = sprintDay(sprint, today);
  if (day === null) return null;
  return { day, pct: Math.round((day / sprint.lengthDays) * 100) };
}

export function sprintEnded(sprint: Sprint, today: Date): boolean {
  return daysBetween(sprint.endDate, today) > 0;
}
