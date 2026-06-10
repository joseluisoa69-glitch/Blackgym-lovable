/**
 * Cálculos de rachas semanales tipo Duolingo.
 * Una semana empieza el lunes (ISO).
 */

export type WeekStreak = {
  week_start: string; // YYYY-MM-DD
  target_days: number;
  completed_days: number;
  achieved: boolean;
};

export function getMonday(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function currentWeekStart(): string {
  return ymd(getMonday());
}

export function weekDates(weekStart: string): Date[] {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * Racha consecutiva de semanas logradas hasta hoy.
 * Asume streaks ordenados por week_start DESC.
 */
export function computeCurrentStreak(streaks: WeekStreak[]): number {
  const sorted = [...streaks].sort((a, b) => (a.week_start > b.week_start ? -1 : 1));
  const current = currentWeekStart();
  let count = 0;
  let cursor = current;
  for (const s of sorted) {
    if (s.week_start > current) continue; // futura, ignorar
    if (s.week_start === cursor) {
      if (s.achieved || cursor === current) {
        // si es la semana actual y aún no la cierra, no rompe la racha
        if (s.achieved) count++;
        // retrocede una semana
        const d = new Date(cursor);
        d.setDate(d.getDate() - 7);
        cursor = ymd(d);
      } else {
        break;
      }
    } else if (s.week_start < cursor) {
      // hueco — la racha se rompió
      break;
    }
  }
  return count;
}

export function computeMaxStreak(streaks: WeekStreak[]): number {
  const sorted = [...streaks].sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const s of sorted) {
    if (!s.achieved) {
      run = 0;
      prev = s.week_start;
      continue;
    }
    if (prev) {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      if (ymd(d) === s.week_start) run++;
      else run = 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = s.week_start;
  }
  return best;
}
