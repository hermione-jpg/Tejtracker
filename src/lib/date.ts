import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth as dfIsSameMonth,
  parseISO,
} from 'date-fns';

export const ISO = 'yyyy-MM-dd';

export function todayISO(): string {
  return format(new Date(), ISO);
}

export function toISO(date: Date): string {
  return format(date, ISO);
}

export function fromISO(iso: string): Date {
  return parseISO(iso);
}

export function shiftDate(iso: string, days: number): string {
  const d = days >= 0 ? addDays(fromISO(iso), days) : subDays(fromISO(iso), -days);
  return toISO(d);
}

export function weekStartISO(iso: string): string {
  return toISO(startOfWeek(fromISO(iso), { weekStartsOn: 1 }));
}

export function monthStartISO(iso: string): string {
  return toISO(startOfMonth(fromISO(iso)));
}

export function formatDisplay(iso: string): string {
  return format(fromISO(iso), 'EEE, d MMM yyyy');
}

// Mon-Sun dates (ISO strings) for the week containing anchorISO.
export function weekDatesISO(anchorISO: string): string[] {
  const start = startOfWeek(fromISO(anchorISO), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
}

// Full calendar-grid dates (always whole weeks, Mon-Sun) covering the month
// containing anchorISO -- e.g. 35 or 42 entries.
export function monthGridISO(anchorISO: string): string[] {
  const monthStart = startOfMonth(fromISO(anchorISO));
  const monthEnd = endOfMonth(fromISO(anchorISO));
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map(toISO);
}

export function isSameMonth(aISO: string, bISO: string): boolean {
  return dfIsSameMonth(fromISO(aISO), fromISO(bISO));
}

// [startISO, endISO] for the actual calendar month containing anchorISO
// (not padded to whole weeks -- that's what monthGridISO is for).
export function monthBoundsISO(anchorISO: string): [string, string] {
  return [toISO(startOfMonth(fromISO(anchorISO))), toISO(endOfMonth(fromISO(anchorISO)))];
}

export function addMonthsISO(anchorISO: string, months: number): string {
  const d = fromISO(anchorISO);
  d.setMonth(d.getMonth() + months);
  return toISO(d);
}

export function formatMonthLabel(anchorISO: string): string {
  return format(fromISO(anchorISO), 'MMMM yyyy');
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}