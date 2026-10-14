import type { Domain, Goal, Project } from '../../lib/types';
import { WORK_CATEGORIES } from '../../lib/types';

export interface EventDraft {
  id?: string;
  domain: Domain;
  activity: string;
  category: string;
  goalId: string;
  projectId: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:MM, 24h
  durationMinutes: number;
  notes: string;
}

interface Props {
  draft: EventDraft;
  onChange: (next: EventDraft) => void;
  goals: Goal[];
  projects: Project[];
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
}

export function EventModal({ draft, onChange, goals, projects, onCancel, onSave, onDelete, saving }: Props) {
  const scopedGoals = goals.filter((g) => g.domain === draft.domain && g.status === 'active');
  const isEditing = Boolean(draft.id);

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? 'Edit time entry' : 'Log time'}</h3>

        <input
          autoFocus
          placeholder="What did you work on?"
          value={draft.activity}
          onChange={(e) => set('activity', e.target.value)}
        />

        <div className="inline-form">
          <select value={draft.domain} onChange={(e) => set('domain', e.target.value as Domain)}>
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
          </select>
          {draft.domain === 'professional' && (
            <select value={draft.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Category</option>
              {WORK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-form">
          <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          <input type="time" value={draft.startTime} onChange={(e) => set('startTime', e.target.value)} />
          <input
            type="number"
            min={5}
            step={5}
            className="minutes-input"
            value={draft.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
          />
          <span className="muted">min</span>
        </div>

        <div className="inline-form">
          {scopedGoals.length > 0 && (
            <select value={draft.goalId} onChange={(e) => set('goalId', e.target.value)}>
              <option value="">No goal</option>
              {scopedGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}
          {draft.domain === 'professional' && projects.length > 0 && (
            <select value={draft.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <textarea
          placeholder="Notes (optional)"
          rows={2}
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
        />

        <div className="modal-actions">
          {isEditing && onDelete && (
            <button type="button" className="danger-button" onClick={onDelete} disabled={saving}>
              Delete
            </button>
          )}
          <div className="modal-actions-right">
            <button type="button" className="link-button" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" onClick={onSave} disabled={saving || !draft.activity.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}