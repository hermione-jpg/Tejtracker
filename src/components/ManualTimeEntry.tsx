import { useState } from 'react';
import type { Domain, Goal, Project, TimeEntry } from '../lib/types';
import { createRow } from '../lib/api';
import { WORK_CATEGORIES } from '../lib/types';

interface Props {
  domain: Domain;
  date: string;
  goals: Goal[];
  projects: Project[];
  onLogged: () => void;
}

export function ManualTimeEntry({ domain, date, goals, projects, onLogged }: Props) {
  const [activity, setActivity] = useState('');
  const [minutes, setMinutes] = useState('');
  const [category, setCategory] = useState('');
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(minutes);
    if (!activity.trim() || !mins || mins <= 0) return;
    setBusy(true);
    try {
      await createRow<TimeEntry>('time_entries', {
        domain,
        activity: activity.trim(),
        category: category || null,
        entry_date: date,
        duration_seconds: Math.round(mins * 60),
        goal_id: goalId || null,
        project_id: projectId || null,
      });
      setActivity('');
      setMinutes('');
      setCategory('');
      setGoalId('');
      setProjectId('');
      onLogged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <input placeholder="Logged activity…" value={activity} onChange={(e) => setActivity(e.target.value)} />
      <input
        type="number"
        min={1}
        placeholder="Minutes"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        className="minutes-input"
      />
      {domain === 'professional' && (
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category</option>
          {WORK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
      {goals.length > 0 && (
        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      )}
      {projects.length > 0 && (
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      )}
      <button type="submit" disabled={busy || !activity.trim() || !minutes}>
        Log time
      </button>
    </form>
  );
}
