
import type { Domain, Goal, Project } from '../../lib/types';
import { WORK_CATEGORIES } from '../../lib/types';

export interface EventDraft {
  id?: string;
  domain: Domain;
  activity: string;
  category: string;
  goalId: string;
  projectId: string;
  date: string;
  startTime: string;
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

function getEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const total = (hours * 60 + minutes + durationMinutes) % (24 * 60);

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
    total % 60,
  ).padStart(2, '0')}`;
}

function getDurationMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  let duration =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

  // If the end time is earlier, treat it as the following day.
  if (duration <= 0) duration += 24 * 60;

  return duration;
}

export function EventModal({
  draft,
  onChange,
  goals,
  projects,
  onCancel,
  onSave,
  onDelete,
  saving,
}: Props) {
  const scopedGoals = goals.filter(
    (g) => g.domain === draft.domain && g.status === 'active',
  );
  const isEditing = Boolean(draft.id);
  const endTime = getEndTime(draft.startTime, draft.durationMinutes);

  function set<K extends keyof EventDraft>(
    key: K,
    value: EventDraft[K],
  ) {
    onChange({ ...draft, [key]: value });
  }

  function changeStartTime(startTime: string) {
    if (!startTime) return;
    set('startTime', startTime);
  }

  function changeEndTime(endTime: string) {
    if (!endTime) return;

    set(
      'durationMinutes',
      getDurationMinutes(draft.startTime, endTime),
    );
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
          <select
            value={draft.domain}
            onChange={(e) => set('domain', e.target.value as Domain)}
          >
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
          </select>

          {draft.domain === 'professional' && (
            <select
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="">Category</option>
              {WORK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="inline-form">
          <label>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </label>

          <label>
            Start time
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => changeStartTime(e.target.value)}
            />
          </label>

          <label>
            End time
            <input
              type="time"
              value={endTime}
              onChange={(e) => changeEndTime(e.target.value)}
            />
          </label>
        </div>

        <p className="muted">
          Duration: {Math.floor(draft.durationMinutes / 60) > 0
            ? `${Math.floor(draft.durationMinutes / 60)} hr `
            : ''}
          {draft.durationMinutes % 60 > 0
            ? `${draft.durationMinutes % 60} min`
            : ''}
        </p>

        <div className="inline-form">
          {scopedGoals.length > 0 && (
            <select
              value={draft.goalId}
              onChange={(e) => set('goalId', e.target.value)}
            >
              <option value="">No goal</option>
              {scopedGoals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          )}

          {draft.domain === 'professional' && projects.length > 0 && (
            <select
              value={draft.projectId}
              onChange={(e) => set('projectId', e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
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
            <button
              type="button"
              className="danger-button"
              onClick={onDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}

          <div className="modal-actions-right">
            <button
              type="button"
              className="link-button"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={
                saving ||
                !draft.activity.trim() ||
                draft.durationMinutes <= 0
              }
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
