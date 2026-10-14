import type { TimeEntry } from '../../lib/types';
import { formatDuration, isSameMonth, todayISO } from '../../lib/date';

interface Props {
  monthDates: string[]; // full weeks grid, usually 35 or 42 ISO dates
  anchorISO: string; // any date within the month being shown
  entries: TimeEntry[];
  onSelectDay: (dayISO: string) => void;
  onAddDay: (dayISO: string) => void;
  onEditEntry: (entry: TimeEntry) => void;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthGrid({ monthDates, anchorISO, entries, onSelectDay, onAddDay, onEditEntry }: Props) {
  const today = todayISO();
  const byDay = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.entry_date) ?? [];
    list.push(e);
    byDay.set(e.entry_date, list);
  }

  return (
    <div className="month-grid">
      <div className="month-grid-head">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="muted">
            {d}
          </div>
        ))}
      </div>
      <div className="month-grid-body">
        {monthDates.map((dayISO) => {
          const dayEntries = (byDay.get(dayISO) ?? []).sort((a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''));
          const total = dayEntries.reduce((s, e) => s + e.duration_seconds, 0);
          const dimmed = !isSameMonth(dayISO, anchorISO);
          const shown = dayEntries.slice(0, 3);
          const extra = dayEntries.length - shown.length;

          return (
            <div key={dayISO} className={`month-cell${dimmed ? ' dimmed' : ''}${dayISO === today ? ' is-today' : ''}`}>
              <div className="month-cell-head">
                <button type="button" className="month-day-number" onClick={() => onSelectDay(dayISO)}>
                  {Number(dayISO.slice(8, 10))}
                </button>
                {total > 0 && <span className="muted">{formatDuration(total)}</span>}
                <button type="button" className="icon-button month-add" onClick={() => onAddDay(dayISO)} aria-label="Add time entry">
                  +
                </button>
              </div>
              <div className="month-cell-chips">
                {shown.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    className={`month-chip domain-${e.domain}`}
                    onClick={() => onEditEntry(e)}
                    title={e.activity}
                  >
                    {e.activity}
                  </button>
                ))}
                {extra > 0 && (
                  <button type="button" className="link-button month-more" onClick={() => onSelectDay(dayISO)}>
                    +{extra} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}