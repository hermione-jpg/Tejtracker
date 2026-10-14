import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeEntry } from '../../lib/types';
import { shiftDate, todayISO, formatDisplay } from '../../lib/date';

interface Props {
  entries: TimeEntry[];
  days?: number;
  onSelectDate?: (date: string) => void;
  selected?: string | null;
}

export function DailyPattern({ entries, days = 14, onSelectDate, selected }: Props) {
  const data = useMemo(() => {
    const today = todayISO();
    const buckets: { date: string; label: string; minutes: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = shiftDate(today, -i);
      buckets.push({ date, label: formatDisplay(date).slice(0, 6), minutes: 0 });
    }
    const index = new Map(buckets.map((b) => [b.date, b]));
    for (const e of entries) {
      const bucket = index.get(e.entry_date);
      if (bucket) bucket.minutes += Math.round(e.duration_seconds / 60);
    }
    return buckets;
  }, [entries, days]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" fontSize={12} interval={Math.ceil(days / 10)} />
        <YAxis tickFormatter={(v) => `${v}m`} width={40} />
        <Tooltip formatter={(v: any) => [`${v} min`, 'Time logged']} labelFormatter={(_, p: any) => (p?.[0]?.payload ? formatDisplay(p[0].payload.date) : '')} />
        <Bar
          dataKey="minutes"
          radius={[4, 4, 0, 0]}
          cursor={onSelectDate ? 'pointer' : undefined}
          onClick={(d: any) => onSelectDate?.(d.date === selected ? '' : d.date)}
          fill="var(--accent)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
