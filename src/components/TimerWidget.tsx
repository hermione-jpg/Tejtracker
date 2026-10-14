import { useState } from 'react';
import { useTimer } from '../lib/TimerContext';
import { formatDuration } from '../lib/date';
import type { Domain } from '../lib/types';
import { WORK_CATEGORIES } from '../lib/types';

interface Props {
  domain: Domain;
  onLogged?: () => void;
}

export function TimerWidget({ domain, onLogged }: Props) {
  const { state, elapsedSeconds, loading, start, stop, discard } = useTimer();
  const [activity, setActivity] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="timer-widget">Loading timer…</div>;

  const running = state?.is_running && state.domain === domain;
  const runningElsewhere = state?.is_running && state.domain !== domain;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!activity.trim()) return;
    setBusy(true);
    try {
      await start({ domain, activity: activity.trim(), category: category || null });
      setActivity('');
      setCategory('');
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await stop();
      onLogged?.();
    } finally {
      setBusy(false);
    }
  }

  if (running) {
    return (
      <div className="timer-widget timer-running">
        <div>
          <div className="timer-elapsed">{formatDuration(elapsedSeconds)}</div>
          <div className="timer-activity">{state?.activity}{state?.category ? ` · ${state.category}` : ''}</div>
        </div>
        <button type="button" onClick={handleStop} disabled={busy}>
          Stop & log
        </button>
      </div>
    );
  }

  if (runningElsewhere) {
    return (
      <div className="timer-widget">
        <p>
          Timer running for {state?.domain}: <strong>{state?.activity}</strong> ({formatDuration(elapsedSeconds)})
        </p>
        <button type="button" className="link-button" onClick={() => discard()} disabled={busy}>
          Discard that timer
        </button>
      </div>
    );
  }

  return (
    <form className="timer-widget" onSubmit={handleStart}>
      <input
        placeholder="What are you working on?"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
      />
      {domain === 'professional' && (
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Category (optional)</option>
          {WORK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
      <button type="submit" disabled={busy || !activity.trim()}>
        Start timer
      </button>
    </form>
  );
}
