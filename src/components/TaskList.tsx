import { useState } from 'react';
import type { Domain, Goal, Project, Task, TaskStatus } from '../lib/types';
import { createRow, deleteRow, updateRow } from '../lib/api';

interface Props {
  domain: Domain;
  tasks: Task[];
  goals: Goal[];
  projects: Project[];
  plannedDate?: string; // when set, new tasks default to this date (Today view)
  onChange: () => void;
}

const PRIORITY_LABEL: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };

export function TaskList({ domain, tasks, goals, projects, plannedDate, onChange }: Props) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createRow<Task>('tasks', {
        domain,
        title: title.trim(),
        status: 'open',
        priority,
        planned_date: plannedDate ?? null,
        goal_id: goalId || null,
        project_id: projectId || null,
      });
      setTitle('');
      setPriority(2);
      setGoalId('');
      setProjectId('');
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(task: Task) {
    const next: TaskStatus = task.status === 'done' ? 'open' : 'done';
    await updateRow<Task>('tasks', task.id, {
      status: next,
      completed_at: next === 'done' ? new Date().toISOString() : null,
    });
    onChange();
  }

  async function remove(id: string) {
    await deleteRow('tasks', id);
    onChange();
  }

  const open = tasks.filter((t) => t.status !== 'done' && t.status !== 'dropped');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <div className="panel">
      <form className="inline-form" onSubmit={handleAdd}>
        <input placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}>
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
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
        <button type="submit" disabled={busy || !title.trim()}>
          Add
        </button>
      </form>

      <ul className="task-list">
        {open.map((t) => (
          <li key={t.id} className="task-item">
            <label>
              <input type="checkbox" checked={false} onChange={() => toggleDone(t)} />
              <span>{t.title}</span>
            </label>
            <span className={`badge priority-${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span>
            {t.project_id && <span className="badge">{projects.find((p) => p.id === t.project_id)?.title}</span>}
            {t.goal_id && <span className="badge">{goals.find((g) => g.id === t.goal_id)?.title}</span>}
            <button type="button" className="icon-button" onClick={() => remove(t.id)} aria-label="Delete task">
              ✕
            </button>
          </li>
        ))}
        {open.length === 0 && <li className="empty-state">Nothing open. Add a task above.</li>}
      </ul>

      {done.length > 0 && (
        <details className="done-section">
          <summary>{done.length} completed</summary>
          <ul className="task-list">
            {done.map((t) => (
              <li key={t.id} className="task-item done">
                <label>
                  <input type="checkbox" checked onChange={() => toggleDone(t)} />
                  <span>{t.title}</span>
                </label>
                <button type="button" className="icon-button" onClick={() => remove(t.id)} aria-label="Delete task">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
