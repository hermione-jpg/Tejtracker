import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeEntry } from '../../lib/types';

interface Props {
  entries: TimeEntry[];
  onSelectCategory?: (category: string) => void;
  selected?: string | null;
}

export function CategoryBreakdown({ entries, onSelectCategory, selected }: Props) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      const key = e.category || 'Uncategorized';
      totals.set(key, (totals.get(key) ?? 0) + e.duration_seconds);
    }
    return Array.from(totals.entries())
      .map(([category, seconds]) => ({ category, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [entries]);

  if (data.length === 0) {
    return <p className="empty-state">No time logged in this range yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${v}m`} />
        <YAxis type="category" dataKey="category" width={120} />
        <Tooltip formatter={(v: any) => [`${v} min`, 'Time']} />
        <Bar
          dataKey="minutes"
          fill="var(--accent)"
          radius={[0, 4, 4, 0]}
          cursor={onSelectCategory ? 'pointer' : undefined}
          onClick={(d: any) => onSelectCategory?.(d.category === selected ? '' : d.category)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
