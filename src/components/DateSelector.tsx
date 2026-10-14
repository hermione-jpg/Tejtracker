import { formatDisplay, shiftDate, todayISO } from '../lib/date';

interface Props {
  date: string;
  onChange: (iso: string) => void;
}

export function DateSelector({ date, onChange }: Props) {
  return (
    <div className="date-selector">
      <button type="button" onClick={() => onChange(shiftDate(date, -1))} aria-label="Previous day">
        ‹
      </button>
      <div className="date-selector-label">
        <strong>{formatDisplay(date)}</strong>
        {date !== todayISO() && (
          <button type="button" className="link-button" onClick={() => onChange(todayISO())}>
            Jump to today
          </button>
        )}
      </div>
      <button type="button" onClick={() => onChange(shiftDate(date, 1))} aria-label="Next day">
        ›
      </button>
      <input type="date" value={date} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
