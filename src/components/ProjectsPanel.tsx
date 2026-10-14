import { useState } from 'react';
import type { Goal, Project, Status } from '../lib/types';
import { createRow, deleteRow, updateRow } from '../lib/api';

interface Props {
  projects: Project[];
  goals: Goal[];
  onChange: () => void;
}

export function ProjectsPanel({ projects, goals, onChange }: Props) {
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createRow<Project>('projects', {
        title: title.trim(),
        goal_id: goalId || null,
        status: 'active',
      });
      setTitle('');
      setGoalId('');
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(project: Project, status: Status) {
    await updateRow<Project>('projects', project.id, { status });
    onChange();
  }

  async function remove(id: string) {
    await deleteRow('projects', id);
    onChange();
  }

  return (
    <div className="panel">
      <h3>Projects</h3>
      <form className="inline-form" onSubmit={handleAdd}>
        <input placeholder="Add a project…" value={title} onChange={(e) => setTitle(e.target.value)} />
        {goals.length > 0 && (
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">No linked goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
        <button type="submit" disabled={busy || !title.trim()}>
          Add
        </button>
      </form>
      <ul className="goal-list">
        {projects.map((p) => (
          <li key={p.id} className="goal-item">
            <div className="goal-item-head">
              <strong>{p.title}</strong>
              <select value={p.status} onChange={(e) => setStatus(p, e.target.value as Status)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
                <option value="dropped">Dropped</option>
              </select>
              <button type="button" className="icon-button" onClick={() => remove(p.id)} aria-label="Delete project">
                ✕
              </button>
            </div>
            {p.goal_id && <div className="muted">Goal: {goals.find((g) => g.id === p.goal_id)?.title}</div>}
          </li>
        ))}
        {projects.length === 0 && <li className="empty-state">No projects yet.</li>}
      </ul>
    </div>
  );
}
