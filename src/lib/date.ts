import { format, addDays, subDays, startOfWeek, startOfMonth, parseISO } from 'date-fns';

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

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
