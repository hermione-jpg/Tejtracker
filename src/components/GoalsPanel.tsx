import { useState } from 'react';
import type { Domain, Goal, Status } from '../lib/types';
import { createRow, deleteRow, updateRow } from '../lib/api';

interface Props {
  domain: Domain;
  goals: Goal[];
  onChange: () => void;
}

export function GoalsPanel({ domain, goals, onChange }: Props) {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [progressDraft, setProgressDraft] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createRow<Goal>('goals', {
        domain,
        title: title.trim(),
        target_date: targetDate || null,
        status: 'active',
      });
      setTitle('');
      setTargetDate('');
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(goal: Goal, status: Status) {
    await updateRow<Goal>('goals', goal.id, { status });
    onChange();
  }

  async function saveProgress(goal: Goal) {
    await updateRow<Goal>('goals', goal.id, { progress_notes: progressDraft });
    setEditingId(null);
    onChange();
  }

  async function remove(id: string) {
    await deleteRow('goals', id);
    onChange();
  }

  return (
    <div className="panel">
      <h3>Goals</h3>
      <form className="inline-form" onSubmit={handleAdd}>
        <input placeholder="Add a goal…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} title="Target date (optional)" />
        <button type="submit" disabled={busy || !title.trim()}>
          Add
        </button>
      </form>

      <ul className="goal-list">
        {goals.map((g) => (
          <li key={g.id} className="goal-item">
            <div className="goal-item-head">
              <strong className={g.status === 'done' ? 'strike' : ''}>{g.title}</strong>
              <select value={g.status} onChange={(e) => setStatus(g, e.target.value as Status)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
                <option value="dropped">Dropped</option>
              </select>
              <button type="button" className="icon-button" onClick={() => remove(g.id)} aria-label="Delete goal">
                ✕
              </button>
            </div>
            {g.target_date && <div className="muted">Target: {g.target_date}</div>}
            {editingId === g.id ? (
              <div className="inline-form">
                <textarea
                  value={progressDraft}
                  onChange={(e) => setProgressDraft(e.target.value)}
                  placeholder="What's the evidence of progress so far?"
                  rows={2}
                />
                <button type="button" onClick={() => saveProgress(g)}>
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setEditingId(g.id);
                  setProgressDraft(g.progress_notes ?? '');
                }}
              >
                {g.progress_notes ? 'Edit progress note' : 'Add progress note'}
              </button>
            )}
            {editingId !== g.id && g.progress_notes && <p className="muted">{g.progress_notes}</p>}
          </li>
        ))}
        {goals.length === 0 && <li className="empty-state">No goals yet.</li>}
      </ul>
    </div>
  );
}
