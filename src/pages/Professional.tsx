import { GoalsPanel } from '../components/GoalsPanel';
import { ProjectsPanel } from '../components/ProjectsPanel';
import { TaskList } from '../components/TaskList';
import { NotesPanel } from '../components/NotesPanel';
import { useCollection } from '../lib/useCollection';
import { formatDuration } from '../lib/date';
import type { Goal, Note, Project, Task, TimeEntry } from '../lib/types';

export default function Professional() {
  const goals = useCollection<Goal>('goals', { domain: 'professional' }, []);
  const projects = useCollection<Project>('projects', {}, []);
  const tasks = useCollection<Task>('tasks', { domain: 'professional' }, []);
  const notes = useCollection<Note>('notes', { domain: 'professional' }, []);
  const recentTime = useCollection<TimeEntry>(
    'time_entries',
    { domain: 'professional', order: 'entry_date', ascending: false, limit: 30 },
    [],
  );

  return (
    <div className="page">
      <h1>Professional</h1>

      <GoalsPanel domain="professional" goals={goals.data} onChange={goals.refresh} />
      <ProjectsPanel projects={projects.data} goals={goals.data} onChange={projects.refresh} />

      <div className="panel">
        <h3>Projects, tasks &amp; deliverables</h3>
        <TaskList
          domain="professional"
          tasks={tasks.data}
          goals={goals.data}
          projects={projects.data}
          onChange={tasks.refresh}
        />
      </div>

      <div className="panel">
        <h3>Work sessions</h3>
        {recentTime.data.length === 0 && <p className="empty-state">Nothing logged yet -- use the timer on Today.</p>}
        <ul className="time-entry-list">
          {recentTime.data.map((e) => (
            <li key={e.id}>
              <span>{e.entry_date}</span>
              <span>{e.activity}</span>
              {e.category && <span className="badge">{e.category}</span>}
              <strong>{formatDuration(e.duration_seconds)}</strong>
            </li>
          ))}
        </ul>
      </div>

      <NotesPanel
        domain="professional"
        notes={notes.data}
        goals={goals.data}
        projects={projects.data}
        onChange={notes.refresh}
        title="Concepts learned &amp; skills applied"
      />
    </div>
  );
}
