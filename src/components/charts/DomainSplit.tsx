import type { TimeEntry } from '../../lib/types';
import { formatDuration } from '../../lib/date';

interface Props {
  entries: TimeEntry[];
}

export function DomainSplit({ entries }: Props) {
  const personal = entries.filter((e) => e.domain === 'personal').reduce((s, e) => s + e.duration_seconds, 0);
  const professional = entries.filter((e) => e.domain === 'professional').reduce((s, e) => s + e.duration_seconds, 0);
  const total = personal + professional;

  if (total === 0) {
    return <p className="empty-state">No time logged in this range yet.</p>;
  }

  const personalPct = Math.round((personal / total) * 100);

  return (
    <div className="domain-split">
      <div className="domain-split-bar">
        <div className="domain-split-fill personal" style={{ width: `${personalPct}%` }} />
      </div>
      <div className="domain-split-labels">
        <span>
          Personal <strong>{formatDuration(personal)}</strong>
        </span>
        <span>
          Professional <strong>{formatDuration(professional)}</strong>
        </span>
      </div>
    </div>
  );
}