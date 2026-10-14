import { useState } from 'react';
import { DateSelector } from '../components/DateSelector';
import { TimerWidget } from '../components/TimerWidget';
import { TaskList } from '../components/TaskList';
import { ManualTimeEntry } from '../components/ManualTimeEntry';
import { ReflectionBox } from '../components/ReflectionBox';
import { RoutinesPanel } from '../components/RoutinesPanel';
import { useCollection } from '../lib/useCollection';
import { formatDuration, todayISO } from '../lib/date';
import type { Goal, Project, Task, TimeEntry } from '../lib/types';

export default function Today() {
  const [date, setDate] = useState(todayISO());

  const tasksP = useCollection<Task>('tasks', { domain: 'personal', planned_date: date }, [date]);
  const tasksW = useCollection<Task>('tasks', { domain: 'professional', planned_date: date }, [date]);
  const goalsP = useCollection<Goal>('goals', { domain: 'personal', status: 'active' }, []);
  const goalsW = useCollection<Goal>('goals', { domain: 'professional', status: 'active' }, []);
  const projects = useCollection<Project>('projects', {}, []);
  const timeToday = useCollection<TimeEntry>('time_entries', { entry_date: date }, [date]);

  const personalMinutes = timeToday.data.filter((e) => e.domain === 'personal').reduce((s, e) => s + e.duration_seconds, 0);
  const workMinutes = timeToday.data.filter((e) => e.domain === 'professional').reduce((s, e) => s + e.duration_seconds, 0);

  function refreshAll() {
    tasksP.refresh();
    tasksW.refresh();
    timeToday.refresh();
  }

  return (
    <div className="page">
      <DateSelector date={date} onChange={setDate} />

      <div className="summary-strip">
        <div>
          <span className="muted">Personal time logged</span>
          <strong>{formatDuration(personalMinutes)}</strong>
        </div>
        <div>
          <span className="muted">Professional time logged</span>
          <strong>{formatDuration(workMinutes)}</strong>
        </div>
      </div>

      <div className="two-col">
        <section>
          <h2>Personal</h2>
          <TimerWidget domain="personal" onLogged={refreshAll} />
          <ManualTimeEntry domain="personal" date={date} goals={goalsP.data} projects={[]} onLogged={refreshAll} />
          <h3>Priorities</h3>
          <TaskList domain="personal" tasks={tasksP.data} goals={goalsP.data} projects={[]} plannedDate={date} onChange={tasksP.refresh} />
        </section>

        <section>
          <h2>Professional</h2>
          <TimerWidget domain="professional" onLogged={refreshAll} />
          <ManualTimeEntry domain="professional" date={date} goals={goalsW.data} projects={projects.data} onLogged={refreshAll} />
          <h3>Priorities</h3>
          <TaskList
            domain="professional"
            tasks={tasksW.data}
            goals={goalsW.data}
            projects={projects.data}
            plannedDate={date}
            onChange={tasksW.refresh}
          />
        </section>
      </div>

      <RoutinesPanel date={date} />
      <ReflectionBox date={date} />
    </div>
  );
}
