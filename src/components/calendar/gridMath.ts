import { fromISO, toISO } from '../../lib/date';

export const DAY_START_HOUR = 6; // grid shows 06:00..23:30
export const DAY_END_HOUR = 24;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT = 26; // px, one 30-min slot
export const SLOTS_PER_DAY = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;

export function clampSlot(slot: number): number {
  return Math.max(0, Math.min(SLOTS_PER_DAY, slot));
}

// Minutes-from-day-start (06:00) for a given Date, used to position events.
export function dateToMinutesFromGridStart(d: Date): number {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

export function minutesToSlot(minutes: number): number {
  return minutes / SLOT_MINUTES;
}

// Build a concrete Date for dayISO at the given slot index (06:00 + slot*30min).
export function slotToDate(dayISO: string, slot: number): Date {
  const d = fromISO(dayISO);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(DAY_START_HOUR * 60 + slot * SLOT_MINUTES);
  return d;
}

export function formatSlotTime(dayISO: string, slot: number): string {
  const d = slotToDate(dayISO, slot);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export interface TimedBlock {
  topPx: number;
  heightPx: number;
}

// Position (and clamp to the visible grid) a start/end pair for one day.
export function layoutBlock(startedAt: string, endedAt: string | null, dayISO: string): TimedBlock {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date(start.getTime() + 30 * 60000);
  const dayStart = slotToDate(dayISO, 0);
  const dayEnd = slotToDate(dayISO, SLOTS_PER_DAY);
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  const startMin = dateToMinutesFromGridStart(clampedStart);
  const endMin = Math.max(startMin + 10, dateToMinutesFromGridStart(clampedEnd));
  const topPx = (startMin / SLOT_MINUTES) * SLOT_HEIGHT;
  const heightPx = Math.max(14, ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT);
  return { topPx, heightPx };
}

export function isoDateOf(d: Date): string {
  return toISO(d);
}