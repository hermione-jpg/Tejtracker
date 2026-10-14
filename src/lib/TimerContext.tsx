import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getTimer, patchTimer, createRow } from './api';
import type { TimerState, Domain, TimeEntry } from './types';
import { todayISO } from './date';

interface StartParams {
  domain: Domain;
  activity: string;
  category?: string | null;
  project_id?: string | null;
  goal_id?: string | null;
  task_id?: string | null;
  notes?: string | null;
}

interface TimerContextValue {
  state: TimerState | null;
  elapsedSeconds: number;
  loading: boolean;
  start: (params: StartParams) => Promise<void>;
  stop: () => Promise<TimeEntry | null>;
  discard: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const computeElapsed = useCallback((s: TimerState | null) => {
    if (!s || !s.is_running || !s.started_at) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getTimer<TimerState>();
        if (cancelled) return;
        setState(s);
        setElapsedSeconds(computeElapsed(s));
      } catch {
        // If this fails (e.g. not authenticated yet) just leave the timer
        // idle -- the rest of the app surfaces the real error.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [computeElapsed]);

  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (state?.is_running) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds(computeElapsed(state));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [state, computeElapsed]);

  const start = useCallback(async (params: StartParams) => {
    const started_at = new Date().toISOString();
    const updated = await patchTimer<TimerState>({
      is_running: true,
      started_at,
      domain: params.domain,
      activity: params.activity,
      category: params.category ?? null,
      project_id: params.project_id ?? null,
      goal_id: params.goal_id ?? null,
      task_id: params.task_id ?? null,
      notes: params.notes ?? null,
    });
    setState(updated);
    setElapsedSeconds(0);
  }, []);

  const stop = useCallback(async (): Promise<TimeEntry | null> => {
    if (!state || !state.is_running || !state.started_at) return null;
    const endedAt = new Date();
    const startedAt = new Date(state.started_at);
    const duration = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

    const entry = await createRow<TimeEntry>('time_entries', {
      domain: state.domain ?? 'personal',
      activity: state.activity ?? 'Untitled',
      category: state.category,
      entry_date: todayISO(),
      duration_seconds: duration,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      project_id: state.project_id,
      goal_id: state.goal_id,
      task_id: state.task_id,
      notes: state.notes,
    });

    const cleared = await patchTimer<TimerState>({
      is_running: false,
      started_at: null,
      domain: null,
      activity: null,
      category: null,
      project_id: null,
      goal_id: null,
      task_id: null,
      notes: null,
    });
    setState(cleared);
    setElapsedSeconds(0);
    return entry;
  }, [state]);

  const discard = useCallback(async () => {
    const cleared = await patchTimer<TimerState>({
      is_running: false,
      started_at: null,
      domain: null,
      activity: null,
      category: null,
      project_id: null,
      goal_id: null,
      task_id: null,
      notes: null,
    });
    setState(cleared);
    setElapsedSeconds(0);
  }, []);

  return (
    <TimerContext.Provider value={{ state, elapsedSeconds, loading, start, stop, discard }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
  return ctx;
}
