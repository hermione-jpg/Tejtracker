
import { useState } from 'react';
import { createRow, updateRow, deleteRow } from '../lib/api';
import { useCollection } from '../lib/useCollection';
import type { Goal, Task, Domain, TaskStatus } from '../lib/types';

const GOAL_CATEGORIES = [
  'Career',
  'Design',
  'Technology/AI',
  'Writing',
  'Research',
  'Learning',
  'Finance',
  'Health',
  'Relationships',
  'Personal',
  'Other',
];

const TASK_CATEGORIES = [
  'design',
  'technology/AI',
  'writing',
  'research',
  'coordination',
  'meetings',
  'learning',
  'personal',
  'other',
];

const GOAL_STATUSES = [
  { value: 'active', label: 'Ongoing' },
  { value: 'paused', label: 'Under review' },
  { value: 'done', label: 'Done' },
  { value: 'dropped', label: 'Dropped' },
] as const;

type GoalStatus = 'active' | 'paused' | 'done' | 'dropped';

const CATEGORY_PREFIX = /^\[\[category:(.*?)\]\]\n?/;

function getGoalCategory(goal: Goal): string {
  return goal.progress_notes?.match(CATEGORY_PREFIX)?.[1] || 'Other';
}

function getGoalNotes(goal: Goal): string {
  return (goal.progress_notes || '').replace(CATEGORY_PREFIX, '');
}

function makeProgressNotes(category: string, notes: string): string {
  return `[[category:${category}]]\n${notes}`.trimEnd();
}

function formatDate(date: string | null): string {
  if (!date) return 'No deadline';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--border, #d9dee5)',
  borderRadius: 8,
  background: 'var(--surface, white)',
  color: 'inherit',
  font: 'inherit',
  boxSizing: 'border-box' as const,
};

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border, #d9dee5)',
  cursor: 'pointer',
  background: 'var(--surface, white)',
  color: 'inherit',
  font: 'inherit',
};

export default function Today() {
  const goals = useCollection<Goal>('goals', {}, []);
  const tasks = useCollection<Task>('tasks', {}, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [filterDomain, setFilterDomain] = useState<'all' | Domain>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyGoal = {
    title: '',
    description: '',
    category: 'Career',
    domain: 'professional' as Domain,
    target_date: '',
    status: 'active' as GoalStatus,
  };

  const [form, setForm] = useState(emptyGoal);

  const [taskForms, setTaskForms] = useState<
    Record<string, { title: string; due_date: string; category: string }>
  >({});

  async function refreshAll() {
    await Promise.all([goals.refresh(), tasks.refresh()]);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyGoal);
    setShowForm(true);
    setError('');
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      description: getGoalNotes(goal),
      category: getGoalCategory(goal),
      domain: goal.domain,
      target_date: goal.target_date || '',
      status: goal.status,
    });
    setShowForm(true);
    setError('');
  }

  async function saveGoal() {
    if (!form.title.trim()) {
      setError('Enter a goal title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: Partial<Goal> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        domain: form.domain,
        target_date: form.target_date || null,
        status: form.status,
        progress_notes: makeProgressNotes(
          form.category,
          getGoalNotesFromText(form.description),
        ),
      };

      if (editingId) {
        await updateRow<Goal>('goals', editingId, payload);
      } else {
        await createRow<Goal>('goals', payload);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyGoal);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save goal.');
    } finally {
      setSaving(false);
    }
  }

  function getGoalNotesFromText(value: string) {
    return value.trim();
  }

  async function changeGoalStatus(goal: Goal, status: GoalStatus) {
    setError('');
    try {
      await updateRow<Goal>('goals', goal.id, { status });
      await goals.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.');
    }
  }

  async function removeGoal(goal: Goal) {
    const linkedTasks = tasks.data.filter((task) => task.goal_id === goal.id);

    const message = linkedTasks.length
      ? `This goal has ${linkedTasks.length} linked task(s). Delete the goal and its tasks?`
      : 'Delete this goal?';

    if (!window.confirm(message)) return;

    setError('');
    try {
      for (const task of linkedTasks) {
        await deleteRow('tasks', task.id);
      }
      await deleteRow('goals', goal.id);
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete goal.');
    }
  }

  async function addTask(goal: Goal) {
    const taskForm = taskForms[goal.id] || {
      title: '',
      due_date: '',
      category: 'other',
    };

    if (!taskForm.title.trim()) {
      setError(`Enter a task title for "${goal.title}".`);
      return;
    }

    setError('');
    try {
      await createRow<Task>('tasks', {
        title: taskForm.title.trim(),
        domain: goal.domain,
        goal_id: goal.id,
        project_id: null,
        status: 'open',
        priority: 2,
        planned_date: null,
        due_date: taskForm.due_date || null,
        category: taskForm.category,
        notes: null,
        completed_at: null,
      });

      setTaskForms((previous) => ({
        ...previous,
        [goal.id]: { title: '', due_date: '', category: 'other' },
      }));

      await tasks.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add task.');
    }
  }

  async function changeTaskStatus(task: Task, status: TaskStatus) {
    setError('');
    try {
      await updateRow<Task>('tasks', task.id, {
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      });
      await tasks.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update task.');
    }
  }

  async function removeTask(task: Task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;

    setError('');
    try {
      await deleteRow('tasks', task.id);
      await tasks.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete task.');
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }

  const visibleGoals = goals.data.filter((goal) => {
    if (filterDomain !== 'all' && goal.domain !== filterDomain) return false;
    if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
    if (filterCategory !== 'all' && getGoalCategory(goal) !== filterCategory) {
      return false;
    }
    return true;
  });

  function goalProgress(goal: Goal) {
    const linkedTasks = tasks.data.filter((task) => task.goal_id === goal.id);
    if (linkedTasks.length === 0) return null;

    const done = linkedTasks.filter((task) => task.status === 'done').length;
    return {
      done,
      total: linkedTasks.length,
      percentage: Math.round((done / linkedTasks.length) * 100),
    };
  }

  const overdueCount = visibleGoals.filter(
    (goal) =>
      goal.target_date &&
      goal.target_date < todayISO() &&
      goal.status !== 'done' &&
      goal.status !== 'dropped',
  ).length;

  return (
    <div className="page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>Goals & Tasks</h1>
          <p style={{ margin: 0, color: 'var(--muted, #687386)' }}>
            Keep track of what you're working towards.
          </p>
        </div>

        <button style={buttonStyle} onClick={startCreate}>
          + Add goal
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Total goals', value: goals.data.length },
          {
            label: 'Ongoing',
            value: goals.data.filter((goal) => goal.status === 'active').length,
          },
          {
            label: 'Under review',
            value: goals.data.filter((goal) => goal.status === 'paused').length,
          },
          {
            label: 'Completed',
            value: goals.data.filter((goal) => goal.status === 'done').length,
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid var(--border, #e0e4e9)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ color: 'var(--muted, #687386)', fontSize: 13 }}>
              {item.label}
            </div>
            <strong style={{ display: 'block', fontSize: 24, marginTop: 6 }}>
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      {showForm && (
        <section
          style={{
            border: '1px solid var(--border, #d9dee5)',
            borderRadius: 12,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {editingId ? 'Edit goal' : 'New goal'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <label>
              Goal title *
              <input
                style={inputStyle}
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="What do you want to achieve?"
              />
            </label>

            <label>
              Area
              <select
                style={inputStyle}
                value={form.domain}
                onChange={(e) =>
                  setForm({ ...form, domain: e.target.value as Domain })
                }
              >
                <option value="personal">Personal</option>
                <option value="professional">Professional</option>
              </select>
            </label>

            <label>
              Category
              <select
                style={inputStyle}
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {GOAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              End date
              <input
                style={inputStyle}
                type="date"
                value={form.target_date}
                onChange={(e) =>
                  setForm({ ...form, target_date: e.target.value })
                }
              />
            </label>

            <label>
              Status
              <select
                style={inputStyle}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as GoalStatus })
                }
              >
                {GOAL_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            Description
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Why does this goal matter? What does success look like?"
            />
          </label>

          {error && (
            <p role="alert" style={{ color: '#b42318' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              style={buttonStyle}
              onClick={saveGoal}
              disabled={saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create goal'}
            </button>
            <button
              style={buttonStyle}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setError('');
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <label>
          Area
          <select
            style={inputStyle}
            value={filterDomain}
            onChange={(e) =>
              setFilterDomain(e.target.value as 'all' | Domain)
            }
          >
            <option value="all">All areas</option>
            <option value="personal">Personal</option>
            <option value="professional">Professional</option>
          </select>
        </label>

        <label>
          Status
          <select
            style={inputStyle}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {GOAL_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select
            style={inputStyle}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {GOAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      {overdueCount > 0 && (
        <p style={{ color: '#b42318', fontSize: 14 }}>
          {overdueCount} overdue goal{overdueCount === 1 ? '' : 's'}
        </p>
      )}

      {(goals.loading || tasks.loading) && <p>Loading goals…</p>}

      {error && !showForm && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      {!goals.loading && visibleGoals.length === 0 && (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px dashed var(--border, #d9dee5)',
            borderRadius: 12,
          }}
        >
          <h3>No goals here yet</h3>
          <p style={{ color: 'var(--muted, #687386)' }}>
            Add a goal to get started. You can add tasks to it later.
          </p>
          <button style={buttonStyle} onClick={startCreate}>
            + Add your first goal
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {visibleGoals.map((goal) => {
          const linkedTasks = tasks.data.filter(
            (task) => task.goal_id === goal.id,
          );
          const progress = goalProgress(goal);
          const expanded = expandedIds.includes(goal.id);
          const isOverdue =
            !!goal.target_date &&
            goal.target_date < todayISO() &&
            goal.status !== 'done' &&
            goal.status !== 'dropped';

          return (
            <article
              key={goal.id}
              style={{
                border: '1px solid var(--border, #d9dee5)',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 20,
                        background: 'var(--subtle, #f0f2f5)',
                      }}
                    >
                      {goal.domain === 'personal' ? 'Personal' : 'Professional'}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 20,
                        background: 'var(--subtle, #f0f2f5)',
                      }}
                    >
                      {getGoalCategory(goal)}
                    </span>
                    {isOverdue && (
                      <span style={{ fontSize: 12, color: '#b42318' }}>
                        Overdue
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 6px' }}>{goal.title}</h3>

                  {getGoalNotes(goal) && (
                    <p
                      style={{
                        margin: '0 0 10px',
                        color: 'var(--muted, #687386)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {getGoalNotes(goal)}
                    </p>
                  )}

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--muted, #687386)',
                      marginBottom: 12,
                    }}
                  >
                    Due: {formatDate(goal.target_date)} · {linkedTasks.length}{' '}
                    task{linkedTasks.length === 1 ? '' : 's'}
                  </div>

                  {progress && (
                    <div style={{ maxWidth: 420 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          marginBottom: 6,
                        }}
                      >
                        <span>
                          {progress.done} of {progress.total} tasks completed
                        </span>
                        <span>{progress.percentage}%</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 10,
                          background: 'var(--subtle, #e8ebef)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progress.percentage}%`,
                            background: 'var(--accent, #51748B)',
                            borderRadius: 10,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {!progress && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--muted, #687386)',
                      }}
                    >
                      No tasks yet — add tasks to track progress.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <select
                    aria-label={`Status for ${goal.title}`}
                    style={{ ...inputStyle, width: 'auto', maxWidth: 160 }}
                    value={goal.status}
                    onChange={(e) =>
                      changeGoalStatus(goal, e.target.value as GoalStatus)
                    }
                  >
                    {GOAL_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>

                  <button style={buttonStyle} onClick={() => startEdit(goal)}>
                    Edit
                  </button>
                  <button
                    style={buttonStyle}
                    onClick={() => toggleExpanded(goal.id)}
                  >
                    {expanded ? 'Hide tasks' : 'Tasks'}
                  </button>
                  <button
                    style={buttonStyle}
                    onClick={() => removeGoal(goal)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expanded && (
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: '1px solid var(--border, #e0e4e9)',
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>Tasks</h4>

                  {linkedTasks.length === 0 && (
                    <p style={{ color: 'var(--muted, #687386)' }}>
                      No tasks added to this goal yet.
                    </p>
                  )}

                  <div style={{ display: 'grid', gap: 10 }}>
                    {linkedTasks.map((task) => {
                      const taskOverdue =
                        !!task.due_date &&
                        task.due_date < todayISO() &&
                        task.status !== 'done' &&
                        task.status !== 'dropped';

                      return (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            padding: 10,
                            borderRadius: 8,
                            background: 'var(--subtle, #f7f8fa)',
                          }}
                        >
                          <span
                            style={{
                              flex: '1 1 180px',
                              textDecoration:
                                task.status === 'done' ? 'line-through' : 'none',
                              opacity: task.status === 'done' ? 0.65 : 1,
                            }}
                          >
                            {task.title}
                            {task.category && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 12,
                                  color: 'var(--muted, #687386)',
                                  marginTop: 3,
                                }}
                              >
                                {task.category}
                              </span>
                            )}
                            {task.due_date && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 12,
                                  color: taskOverdue
                                    ? '#b42318'
                                    : 'var(--muted, #687386)',
                                  marginTop: 3,
                                }}
                              >
                                {taskOverdue ? 'Overdue · ' : 'Due: '}
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </span>

                          <select
                            aria-label={`Status for task ${task.title}`}
                            style={{ ...inputStyle, width: 'auto' }}
                            value={task.status}
                            onChange={(e) =>
                              changeTaskStatus(
                                task,
                                e.target.value as TaskStatus,
                              )
                            }
                          >
                            <option value="open">Not started</option>
                            <option value="in_progress">Ongoing</option>
                            <option value="done">Done</option>
                            <option value="dropped">Dropped</option>
                          </select>

                          <button
                            style={buttonStyle}
                            onClick={() => removeTask(task)}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 8,
                      marginTop: 14,
                      alignItems: 'end',
                    }}
                  >
                    <label>
                      New task *
                      <input
                        style={inputStyle}
                        value={taskForms[goal.id]?.title || ''}
                        onChange={(e) =>
                          setTaskForms((previous) => ({
                            ...previous,
                            [goal.id]: {
                              title: e.target.value,
                              due_date: previous[goal.id]?.due_date || '',
                              category:
                                previous[goal.id]?.category || 'other',
                            },
                          }))
                        }
                        placeholder="Add a task"
                      />
                    </label>

                    <label>
                      Task category
                      <select
                        style={inputStyle}
                        value={taskForms[goal.id]?.category || 'other'}
                        onChange={(e) =>
                          setTaskForms((previous) => ({
                            ...previous,
                            [goal.id]: {
                              title: previous[goal.id]?.title || '',
                              due_date: previous[goal.id]?.due_date || '',
                              category: e.target.value,
                            },
                          }))
                        }
                      >
                        {TASK_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Task deadline
                      <input
                        style={inputStyle}
                        type="date"
                        value={taskForms[goal.id]?.due_date || ''}
                        onChange={(e) =>
                          setTaskForms((previous) => ({
                            ...previous,
                            [goal.id]: {
                              title: previous[goal.id]?.title || '',
                              due_date: e.target.value,
                              category:
                                previous[goal.id]?.category || 'other',
                            },
                          }))
                        }
                      />
                    </label>

                    <button
                      style={buttonStyle}
                      onClick={() => addTask(goal)}
                    >
                      + Add task
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
