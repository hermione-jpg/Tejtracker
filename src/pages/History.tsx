import { useMemo, useState } from 'react';
import { useCollection } from '../lib/useCollection';
import { DailyPattern } from '../components/charts/DailyPattern';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown';
import { GoalTimeChart } from '../components/charts/GoalTimeChart';
import { formatDisplay, formatDuration, shiftDate, todayISO } from '../lib/date';
import type { Domain, Goal, Note, Task, TimeEntry } from '../lib/types';

type DomainFilter = Domain | 'combined';
const RANGE_OPTIONS = [7, 14, 30, 90] as const;

export default function History() {
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('combined');
  const [rangeDays, setRangeDays] = useState<(typeof RANGE_OPTIONS)[number]>(14);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const since = shiftDate(todayISO(), -(rangeDays - 1));
  const timeEntries = useCollection<TimeEntry>('time_entries', { 'entry_date': `gte.${since}` }, [since]);
  const goals = useCollection<Goal>('goals', {}, []);
  const notes = useCollection<Note>('notes', {}, []);
  const doneTasks = useCollection<Task>('tasks', { status: 'done', order: 'completed_at', ascending: false, limit: 50 }, []);

  const scopedEntries = useMemo(
    () => timeEntries.data.filter((e) => domainFilter === 'combined' || e.domain === domainFilter),
    [timeEntries.data, domainFilter],
  );

  const drilldown = useMemo(() => {
    return scopedEntries.filter((e) => {
      if (selectedCategory && (e.category || 'Uncategorized') !== selectedCategory) return false;
      if (selectedDate && e.entry_date !== selectedDate) return false;
      if (selectedGoal && e.goal_id !== selectedGoal) return false;
      return true;
    });
  }, [scopedEntries, selectedCategory, selectedDate, selectedGoal]);

  const showDrilldown = Boolean(selectedCategory || selectedDate || selectedGoal);

  const filteredNotes = useMemo(() => {
    const scoped = notes.data.filter((n) => domainFilter === 'combined' || n.domain === domainFilter);
    if (!search.trim()) return scoped.slice(0, 20);
    const q = search.toLowerCase();
    return scoped.filter((n) => n.content.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q));
  }, [notes.data, domainFilter, search]);

  const scopedGoals = useMemo(() => goals.data.filter((g) => domainFilter === 'combined' || g.domain === domainFilter), [goals.data, domainFilter]);

  return (
    <div className="page">
      <h1>History &amp; Insights</h1>

      <div className="filter-row">
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value as DomainFilter)}>
          <option value="combined">Combined</option>
          <option value="personal">Personal</option>
          <option value="professional">Professional</option>
        </select>
        <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value) as any)}>
          {RANGE_OPTIONS.map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        <h3>Daily pattern</h3>
        <DailyPattern entries={scopedEntries} days={rangeDays} onSelectDate={setSelectedDate} selected={selectedDate} />
      </div>

      <div className="panel">
        <h3>Time by category</h3>
        <CategoryBreakdown entries={scopedEntries} onSelectCategory={setSelectedCategory} selected={selectedCategory} />
      </div>

      <div className="panel">
        <h3>Time invested by goal</h3>
        <GoalTimeChart entries={scopedEntries} goals={scopedGoals} onSelectGoal={setSelectedGoal} selected={selectedGoal} />
      </div>

      {showDrilldown && (
        <div className="panel">
          <h3>
            Records
            {selectedCategory ? ` · ${selectedCategory}` : ''}
            {selectedDate ? ` · ${formatDisplay(selectedDate)}` : ''}
            {selectedGoal ? ` · ${scopedGoals.find((g) => g.id === selectedGoal)?.title}` : ''}
          </h3>
          <ul className="time-entry-list">
            {drilldown.map((e) => (
              <li key={e.id}>
                <span>{e.entry_date}</span>
                <span>{e.activity}</span>
                {e.category && <span className="badge">{e.category}</span>}
                <strong>{formatDuration(e.duration_seconds)}</strong>
              </li>
            ))}
            {drilldown.length === 0 && <li className="empty-state">No records match.</li>}
          </ul>
        </div>
      )}

      <div className="panel">
        <h3>Goals receiving attention</h3>
        <ul className="goal-list">
          {scopedGoals
            .filter((g) => g.status === 'active')
            .map((g) => (
              <li key={g.id} className="goal-item">
                <strong>{g.title}</strong>
                {g.progress_notes && <p className="muted">{g.progress_notes}</p>}
              </li>
            ))}
          {scopedGoals.filter((g) => g.status === 'active').length === 0 && (
            <li className="empty-state">No active goals in this scope.</li>
          )}
        </ul>
      </div>

      <div className="panel">
        <h3>Tasks completed recently</h3>
        <ul className="time-entry-list">
          {doneTasks.data
            .filter((t) => domainFilter === 'combined' || t.domain === domainFilter)
            .map((t) => (
              <li key={t.id}>
                <span>{t.completed_at ? new Date(t.completed_at).toLocaleDateString() : ''}</span>
                <span>{t.title}</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="panel">
        <h3>Search notes</h3>
        <input className="search-input" placeholder="Search learning notes, ideas, reflections…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <ul className="note-list">
          {filteredNotes.map((n) => (
            <li key={n.id} className="note-item">
              <div className="note-item-head">
                <span className="badge">{n.kind}</span>
                <span className="muted">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <p>{n.content}</p>
            </li>
          ))}
          {filteredNotes.length === 0 && <li className="empty-state">No notes match.</li>}
        </ul>
      </div>
    </div>
  );
}
