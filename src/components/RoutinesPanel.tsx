import { useEffect, useState } from 'react';
import type { Routine, RoutineLog } from '../lib/types';
import { createRow, deleteRow, listRows } from '../lib/api';

interface Props {
  date: string;
}

export function RoutinesPanel({ date }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r, l] = await Promise.all([
      listRows<Routine>('routines', { active: true }),
      listRows<RoutineLog>('routine_logs', { log_date: date }),
    ]);
    setRoutines(r);
    setLogs(l);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function addRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createRow<Routine>('routines', { title: newTitle.trim(), frequency: 'daily', active: true });
    setNewTitle('');
    load();
  }

  async function toggle(routine: Routine) {
    const existing = logs.find((l) => l.routine_id === routine.id);
    if (existing) {
      await deleteRow('routine_logs', existing.id);
    } else {
      await createRow<RoutineLog>('routine_logs', { routine_id: routine.id, log_date: date, done: true });
    }
    load();
  }

  async function removeRoutine(id: string) {
    await deleteRow('routines', id);
    load();
  }

  if (loading) return null;

  return (
    <div className="panel">
      <h3>Routines <span className="muted">(optional)</span></h3>
      <form className="inline-form" onSubmit={addRoutine}>
        <input placeholder="Add a routine…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button type="submit" disabled={!newTitle.trim()}>
          Add
        </button>
      </form>
      <ul className="routine-list">
        {routines.map((r) => {
          const done = logs.some((l) => l.routine_id === r.id);
          return (
            <li key={r.id} className="routine-item">
              <label>
                <input type="checkbox" checked={done} onChange={() => toggle(r)} />
                {r.title}
              </label>
              <button type="button" className="icon-button" onClick={() => removeRoutine(r.id)} aria-label="Remove routine">
                ✕
              </button>
            </li>
          );
        })}
        {routines.length === 0 && <li className="empty-state">No routines set up.</li>}
      </ul>
    </div>
  );
}
