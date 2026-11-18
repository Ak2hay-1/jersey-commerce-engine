'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatNumber } from '@/lib/format';

export interface DashboardBarPoint {
  key: string;
  label: string;
  value: number;
  fill?: string;
}

export function DashboardBarChart({
  points,
  emptyLabel,
  valueFormat = 'number',
  layout = 'vertical',
  height = 220,
}: {
  points: DashboardBarPoint[];
  emptyLabel: string;
  valueFormat?: 'number' | 'money';
  layout?: 'vertical' | 'horizontal';
  height?: number;
}): React.JSX.Element {
  const data = points.filter((point) => point.value > 0);
  if (data.length === 0) {
    return (
      <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        {emptyLabel}
      </p>
    );
  }

  const formatValue = (value: number) => (valueFormat === 'money' ? formatMoney(value) : formatNumber(value));
  const isHorizontal = layout === 'horizontal';

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 6" vertical={!isHorizontal} horizontal={isHorizontal} stroke="hsl(var(--border))" />
          {isHorizontal ? (
            <>
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            </>
          )}
          <Tooltip
            formatter={(value) => formatValue(Number(value ?? 0))}
            contentStyle={{ borderRadius: 16, border: 'none', boxShadow: 'var(--erp-shadow)' }}
          />
          <Bar dataKey="value" radius={[10, 10, 10, 10]} fill="hsl(var(--erp-orange))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
