import { GoalsPanel } from '../components/GoalsPanel';
import { NotesPanel } from '../components/NotesPanel';
import { RoutinesPanel } from '../components/RoutinesPanel';
import { useCollection } from '../lib/useCollection';
import { formatDuration, todayISO } from '../lib/date';
import type { Goal, Note, TimeEntry } from '../lib/types';

export default function Personal() {
  const goals = useCollection<Goal>('goals', { domain: 'personal' }, []);
  const notes = useCollection<Note>('notes', { domain: 'personal' }, []);
  const recentTime = useCollection<TimeEntry>(
    'time_entries',
    { domain: 'personal', order: 'entry_date', ascending: false, limit: 30 },
    [],
  );

  return (
    <div className="page">
      <h1>Personal</h1>

      <GoalsPanel domain="personal" goals={goals.data} onChange={goals.refresh} />

      <div className="panel">
        <h3>Activities &amp; time spent</h3>
        {recentTime.data.length === 0 && <p className="empty-state">Nothing logged yet -- use the timer on Today.</p>}
        <ul className="time-entry-list">
          {recentTime.data.map((e) => (
            <li key={e.id}>
              <span>{e.entry_date === todayISO() ? 'Today' : e.entry_date}</span>
              <span>{e.activity}</span>
              <strong>{formatDuration(e.duration_seconds)}</strong>
            </li>
          ))}
        </ul>
      </div>

      <RoutinesPanel date={todayISO()} />

      <NotesPanel
        domain="personal"
        notes={notes.data}
        goals={goals.data}
        projects={[]}
        onChange={notes.refresh}
        title="Ideas, learning &amp; reflections"
      />
    </div>
  );
}
