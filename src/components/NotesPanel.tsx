import { useMemo, useState } from 'react';
import type { Domain, Goal, Note, NoteKind, Project } from '../lib/types';
import { createRow, deleteRow } from '../lib/api';

interface Props {
  domain: Domain;
  notes: Note[];
  goals: Goal[];
  projects: Project[];
  onChange: () => void;
  defaultKind?: NoteKind;
  title?: string;
}

export function NotesPanel({ domain, notes, goals, projects, onChange, defaultKind = 'learning', title = 'Notes' }: Props) {
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<NoteKind>(defaultKind);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.content.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q));
  }, [notes, search]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await createRow<Note>('notes', {
        domain,
        kind,
        content: content.trim(),
        goal_id: goalId || null,
        project_id: projectId || null,
      });
      setContent('');
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteRow('notes', id);
    onChange();
  }

  return (
    <div className="panel">
      <h3>{title}</h3>
      <form className="inline-form stacked" onSubmit={handleAdd}>
        <textarea
          placeholder="Capture a thought, something learned, or an idea…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
        />
        <div className="inline-form">
          <select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="learning">Learning</option>
            <option value="idea">Idea</option>
            <option value="note">Note</option>
            <option value="reflection">Reflection</option>
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
          <button type="submit" disabled={busy || !content.trim()}>
            Save
          </button>
        </div>
      </form>

      {notes.length > 3 && (
        <input className="search-input" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
      )}

      <ul className="note-list">
        {filtered.map((n) => (
          <li key={n.id} className="note-item">
            <div className="note-item-head">
              <span className="badge">{n.kind}</span>
              <span className="muted">{new Date(n.created_at).toLocaleDateString()}</span>
              <button type="button" className="icon-button" onClick={() => remove(n.id)} aria-label="Delete note">
                ✕
              </button>
            </div>
            <p>{n.content}</p>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty-state">Nothing here yet.</li>}
      </ul>
    </div>
  );
}
