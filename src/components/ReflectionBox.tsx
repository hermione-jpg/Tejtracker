import { useEffect, useState } from 'react';
import type { DailyReflection } from '../lib/types';
import { createRow, listRows, updateRow } from '../lib/api';

interface Props {
  date: string;
}

export function ReflectionBox({ date }: Props) {
  const [reflection, setReflection] = useState<DailyReflection | null>(null);
  const [accomplishments, setAccomplishments] = useState('');
  const [learnings, setLearnings] = useState('');
  const [continueTomorrow, setContinueTomorrow] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listRows<DailyReflection>('daily_reflections', { reflection_date: date }).then((rows) => {
      if (cancelled) return;
      const r = rows[0] ?? null;
      setReflection(r);
      setAccomplishments(r?.accomplishments ?? '');
      setLearnings(r?.learnings ?? '');
      setContinueTomorrow(r?.continue_tomorrow ?? '');
      setSaved(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function save() {
    if (reflection) {
      const updated = await updateRow<DailyReflection>('daily_reflections', reflection.id, {
        accomplishments,
        learnings,
        continue_tomorrow: continueTomorrow,
        updated_at: new Date().toISOString(),
      });
      setReflection(updated);
    } else {
      const created = await createRow<DailyReflection>('daily_reflections', {
        reflection_date: date,
        accomplishments,
        learnings,
        continue_tomorrow: continueTomorrow,
      });
      setReflection(created);
    }
    setSaved(true);
  }

  if (loading) return null;

  return (
    <div className="panel">
      <h3>Evening reflection <span className="muted">(optional)</span></h3>
      <label>
        What did you accomplish?
        <textarea
          rows={2}
          value={accomplishments}
          onChange={(e) => {
            setAccomplishments(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <label>
        What did you learn?
        <textarea
          rows={2}
          value={learnings}
          onChange={(e) => {
            setLearnings(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <label>
        What to continue tomorrow?
        <textarea
          rows={2}
          value={continueTomorrow}
          onChange={(e) => {
            setContinueTomorrow(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button type="button" onClick={save} disabled={saved}>
        {saved ? 'Saved' : 'Save reflection'}
      </button>
    </div>
  );
}
