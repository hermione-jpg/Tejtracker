import { useMemo, useState } from 'react';
import { WeekGrid } from '../components/calendar/WeekGrid';
import { MonthGrid } from '../components/calendar/MonthGrid';
import { EventModal } from '../components/calendar/EventModal';
import type { EventDraft } from '../components/calendar/EventModal';
import { slotToDate, SLOT_MINUTES } from '../components/calendar/gridMath';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown';
import { GoalTimeChart } from '../components/charts/GoalTimeChart';
import { DomainSplit } from '../components/charts/DomainSplit';
import { useCollection } from '../lib/useCollection';
import { createRow, deleteRow, updateRow } from '../lib/api';
import type { Domain, Goal, Project, TimeEntry } from '../lib/types';
import {
  weekDatesISO,
  monthGridISO,
  monthBoundsISO,
  formatMonthLabel,
  formatDisplay,
  formatDuration,
  shiftDate,
  addMonthsISO,
  todayISO,
} from '../lib/date';

type ViewMode = 'week' | 'month';
type DomainFilter = Domain | 'combined';

function emptyDraft(domain: Domain): EventDraft {
  return {
    domain,
    activity: '',
    category: '',
    goalId: '',
    projectId: '',
    date: todayISO(),
    startTime: '09:00',
    durationMinutes: 30,
    notes: '',
  };
}

export default function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(todayISO());
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('combined');
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const allEntries = useCollection<TimeEntry>('time_entries', {}, []);
  const goals = useCollection<Goal>('goals', {}, []);
  const projects = useCollection<Project>('projects', {}, []);

  const entries = useMemo(
    () => (domainFilter === 'combined' ? allEntries.data : allEntries.data.filter((e) => e.domain === domainFilter)),
    [allEntries.data, domainFilter],
  );

  const weekDates = useMemo(() => weekDatesISO(anchor), [anchor]);
  const monthDates = useMemo(() => monthGridISO(anchor), [anchor]);
  const [monthStart, monthEnd] = useMemo(() => monthBoundsISO(anchor), [anchor]);

  const periodEntries = useMemo(() => {
    if (viewMode === 'week') {
      const set = new Set(weekDates);
      return entries.filter((e) => set.has(e.entry_date));
    }
    return entries.filter((e) => e.entry_date >= monthStart && e.entry_date <= monthEnd);
  }, [entries, viewMode, weekDates, monthStart, monthEnd]);

  const cumulativeEntries = useMemo(() => entries.filter((e) => e.entry_date <= todayISO()), [entries]);

  const unscheduled = useMemo(
    () => periodEntries.filter((e) => !e.started_at).sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [periodEntries],
  );

  function refresh() {
    allEntries.refresh();
  }

  function goPrev() {
    setAnchor((a) => (viewMode === 'week' ? shiftDate(a, -7) : addMonthsISO(a, -1)));
  }
  function goNext() {
    setAnchor((a) => (viewMode === 'week' ? shiftDate(a, 7) : addMonthsISO(a, 1)));
  }
  function goToday() {
    setAnchor(todayISO());
  }

  function openCreate(dayISO: string, startSlot?: number, endSlot?: number) {
    const domain: Domain = domainFilter === 'combined' ? 'personal' : domainFilter;
    const base = emptyDraft(domain);
    base.date = dayISO;
    if (startSlot !== undefined && endSlot !== undefined) {
      const start = slotToDate(dayISO, startSlot);
      base.startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      base.durationMinutes = Math.max(SLOT_MINUTES, (endSlot - startSlot) * SLOT_MINUTES);
    }
    setDraft(base);
  }

  function openEdit(entry: TimeEntry) {
    let startTime = '09:00';
    const date = entry.entry_date;
    if (entry.started_at) {
      const d = new Date(entry.started_at);
      startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setDraft({
      id: entry.id,
      domain: entry.domain,
      activity: entry.activity,
      category: entry.category ?? '',
      goalId: entry.goal_id ?? '',
      projectId: entry.project_id ?? '',
      date,
      startTime,
      durationMinutes: Math.max(5, Math.round(entry.duration_seconds / 60)),
      notes: entry.notes ?? '',
    });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const [h, m] = draft.startTime.split(':').map(Number);
      const startedAt = new Date(`${draft.date}T00:00:00`);
      startedAt.setHours(h, m, 0, 0);
      const endedAt = new Date(startedAt.getTime() + draft.durationMinutes * 60000);
      const payload: Partial<TimeEntry> = {
        domain: draft.domain,
        activity: draft.activity.trim(),
        category: draft.domain === 'professional' ? draft.category || null : null,
        goal_id: draft.goalId || null,
        project_id: draft.domain === 'professional' ? draft.projectId || null : null,
        entry_date: draft.date,
        duration_seconds: draft.durationMinutes * 60,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        notes: draft.notes || null,
      };
      if (draft.id) {
        await updateRow<TimeEntry>('time_entries', draft.id, payload);
      } else {
        await createRow<TimeEntry>('time_entries', payload);
      }
      setDraft(null);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await deleteRow('time_entries', draft.id);
      setDraft(null);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(entry: TimeEntry, newDayISO: string, newStartSlot: number) {
    const newStart = slotToDate(newDayISO, newStartSlot);
    const newEnd = new Date(newStart.getTime() + entry.duration_seconds * 1000);
    allEntries.setData((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, entry_date: newDayISO, started_at: newStart.toISOString(), ended_at: newEnd.toISOString() }
          : e,
      ),
    );
    await updateRow<TimeEntry>('time_entries', entry.id, {
      entry_date: newDayISO,
      started_at: newStart.toISOString(),
      ended_at: newEnd.toISOString(),
    });
    refresh();
  }

  const timedEntries = useMemo(() => periodEntries.filter((e) => Boolean(e.started_at)), [periodEntries]);

  return (
    <div className="page">
      <div className="cal-toolbar">
        <div className="inline-form">
          <button type="button" onClick={goPrev}>
            ‹
          </button>
          <button type="button" onClick={goToday}>
            Today
          </button>
          <button type="button" onClick={goNext}>
            ›
          </button>
          <strong>{viewMode === 'week' ? `${formatDisplay(weekDates[0])} – ${formatDisplay(weekDates[6])}` : formatMonthLabel(anchor)}</strong>
        </div>
        <div className="inline-form">
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value as DomainFilter)}>
            <option value="combined">Combined</option>
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
          </select>
          <div className="view-toggle">
            <button type="button" className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>
              Week
            </button>
            <button type="button" className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>
              Month
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'week' ? (
        <WeekGrid
          weekDates={weekDates}
          entries={timedEntries}
          onRequestCreate={openCreate}
          onRequestEdit={openEdit}
          onMoveEntry={handleMove}
        />
      ) : (
        <MonthGrid
          monthDates={monthDates}
          anchorISO={anchor}
          entries={periodEntries}
          onSelectDay={(d) => {
            setAnchor(d);
            setViewMode('week');
          }}
          onAddDay={(d) => openCreate(d)}
          onEditEntry={openEdit}
        />
      )}

      {viewMode === 'week' && unscheduled.length > 0 && (
        <div className="panel">
          <h3>Unscheduled this week</h3>
          <p className="muted">Logged without a specific time (e.g. via the timer on the Today page).</p>
          <ul className="time-entry-list">
            {unscheduled.map((e) => (
              <li key={e.id}>
                <span>{e.entry_date}</span>
                <button type="button" className="link-button" onClick={() => openEdit(e)}>
                  {e.activity}
                </button>
                <strong>{formatDuration(e.duration_seconds)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Metrics</h2>

      <div className="panel">
        <h3>{viewMode === 'week' ? 'This week' : 'This month'}</h3>
        <DomainSplit entries={periodEntries} />
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Time by category {viewMode === 'week' ? '(this week)' : '(this month)'}</h3>
          <CategoryBreakdown entries={periodEntries} />
        </div>
        <div className="panel">
          <h3>Time by category (all time to date)</h3>
          <CategoryBreakdown entries={cumulativeEntries} />
        </div>
      </div>

      <div className="panel">
        <h3>Time invested by goal (all time to date)</h3>
        <GoalTimeChart entries={cumulativeEntries} goals={goals.data} />
      </div>

      {draft && (
        <EventModal
          draft={draft}
          onChange={setDraft}
          goals={goals.data}
          projects={projects.data}
          onCancel={() => setDraft(null)}
          onSave={handleSave}
          onDelete={draft.id ? handleDelete : undefined}
          saving={saving}
        />
      )}
    </div>
  );
}