export type Domain = 'personal' | 'professional';
export type Status = 'active' | 'paused' | 'done' | 'dropped';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'dropped';

export const WORK_CATEGORIES = [
  'design',
  'technology/AI',
  'writing',
  'research',
  'coordination',
  'meetings',
  'learning',
] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export interface Goal {
  id: string;
  domain: Domain;
  title: string;
  description: string | null;
  target_date: string | null;
  status: Status;
  progress_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  goal_id: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  domain: Domain;
  title: string;
  status: TaskStatus;
  priority: 1 | 2 | 3;
  planned_date: string | null;
  due_date: string | null;
  goal_id: string | null;
  project_id: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TimeEntry {
  id: string;
  domain: Domain;
  activity: string;
  category: string | null;
  entry_date: string;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  project_id: string | null;
  goal_id: string | null;
  task_id: string | null;
  notes: string | null;
  created_at: string;
}

export type NoteKind = 'note' | 'learning' | 'reflection' | 'idea';

export interface Note {
  id: string;
  domain: Domain;
  kind: NoteKind;
  title: string | null;
  content: string;
  project_id: string | null;
  goal_id: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  active: boolean;
  created_at: string;
}

export interface RoutineLog {
  id: string;
  routine_id: string;
  log_date: string;
  done: boolean;
  created_at: string;
}

export interface DailyReflection {
  id: string;
  reflection_date: string;
  accomplishments: string | null;
  learnings: string | null;
  continue_tomorrow: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimerState {
  id: 1;
  is_running: boolean;
  started_at: string | null;
  domain: Domain | null;
  activity: string | null;
  category: string | null;
  project_id: string | null;
  goal_id: string | null;
  task_id: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ExportPayload {
  exported_at: string;
  version: number;
  tables: Record<string, unknown[]>;
}
