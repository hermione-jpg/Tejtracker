import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Goal, TimeEntry } from '../../lib/types';

interface Props {
  entries: TimeEntry[];
  goals: Goal[];
  onSelectGoal?: (goalId: string) => void;
  selected?: string | null;
}

export function GoalTimeChart({ entries, goals, onSelectGoal, selected }: Props) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (!e.goal_id) continue;
      totals.set(e.goal_id, (totals.get(e.goal_id) ?? 0) + e.duration_seconds);
    }
    return Array.from(totals.entries())
      .map(([goalId, seconds]) => ({
        goalId,
        title: goals.find((g) => g.id === goalId)?.title ?? 'Unknown goal',
        minutes: Math.round(seconds / 60),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [entries, goals]);

  if (data.length === 0) {
    return <p className="empty-state">No time has been logged against a goal yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${v}m`} />
        <YAxis type="category" dataKey="title" width={140} />
        <Tooltip formatter={(v: any) => [`${v} min`, 'Time invested']} />
        <Bar
          dataKey="minutes"
          fill="var(--accent-2)"
          radius={[0, 4, 4, 0]}
          cursor={onSelectGoal ? 'pointer' : undefined}
          onClick={(d: any) => onSelectGoal?.(d.goalId === selected ? '' : d.goalId)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
