
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeEntry } from '../../lib/types';

interface Props {
  entries: TimeEntry[];
  onSelectCategory?: (category: string) => void;
  selected?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  Personal: '#7C83FD',
  design: '#E879A9',
  'technology/AI': '#6366F1',
  writing: '#F59E0B',
  research: '#14B8A6',
  coordination: '#F97316',
  meetings: '#EC4899',
  learning: '#0EA5E9',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#8B5CF6';
}

function formatTime(minutes: number): string {
  if (minutes === 0) return '0';
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;

  return Number.isInteger(hours)
    ? `${hours}h`
    : `${Math.floor(hours)}h ${minutes % 60}m`;
}

export function CategoryBreakdown({
  entries,
  onSelectCategory,
  selected,
}: Props) {
  const data = useMemo(() => {
    const totals = new Map<string, number>();

    for (const entry of entries) {
      const category =
        entry.domain === 'personal' ? 'Personal' : entry.category;

      // Exclude uncategorized professional entries.
      if (!category) continue;

      totals.set(
        category,
        (totals.get(category) ?? 0) + entry.duration_seconds,
      );
    }

    return Array.from(totals.entries())
      .map(([category, seconds]) => ({
        category,
        minutes: Math.round(seconds / 60),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [entries]);

  if (data.length === 0) {
    return (
      <p className="empty-state">
        No categorized time logged in this range yet.
      </p>
    );
  }

  const maxMinutes = Math.max(...data.map((item) => item.minutes));

  // Keep the axis in 60-minute increments, with enough room for the
  // largest bar. Show at least one hour of scale for short durations.
  const maxHours = Math.max(1, Math.ceil(maxMinutes / 60));
  const axisMax = maxHours * 60;

  const ticks = Array.from(
    { length: maxHours + 1 },
    (_, index) => index * 60,
  );

  return (
    <ResponsiveContainer
      width="100%"
      height={Math.max(160, data.length * 36)}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 4, left: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />

        <XAxis
          type="number"
          domain={[0, axisMax]}
          ticks={ticks}
          tickFormatter={formatTime}
          allowDecimals={false}
        />

        <YAxis
          type="category"
          dataKey="category"
          width={120}
        />

        <Tooltip
          formatter={(value) => [
            formatTime(Number(value ?? 0)),
            'Time logged',
          ]}
        />

        <Bar
          dataKey="minutes"
          radius={[0, 4, 4, 0]}
          cursor={onSelectCategory ? 'pointer' : undefined}
          onClick={(item: any) =>
            onSelectCategory?.(
              item.category === selected ? '' : item.category,
            )
          }
        >
          {data.map((item) => (
            <Cell
              key={item.category}
              fill={getCategoryColor(item.category)}
              opacity={
                selected && selected !== item.category ? 0.35 : 1
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
