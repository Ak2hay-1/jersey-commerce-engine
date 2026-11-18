'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { formatMoney, formatNumber } from '@/lib/format';

export interface SaleAnalyticsSlice {
  key: string;
  label: string;
  value: number;
  count?: number;
  color: string;
}

const FALLBACK_COLORS = [
  'hsl(var(--erp-orange))',
  'hsl(var(--erp-purple))',
  'hsl(var(--erp-cyan))',
  'hsl(var(--erp-lime))',
];

export function SaleAnalyticsDonut({
  slices,
  centerLabel,
}: {
  slices: SaleAnalyticsSlice[];
  centerLabel: string;
}): React.JSX.Element {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0 || slices.length === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No channel mix for this period.</p>;
  }

  const chartData = slices.map((slice, index) => ({
    ...slice,
    color: slice.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="relative mx-auto h-52 w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
              {chartData.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-[7rem] text-center">
            <p className="text-sm font-semibold leading-tight">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        {chartData.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <li key={slice.key} className="flex items-start gap-2">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
              <div>
                <p className="font-medium">
                  {pct}% {slice.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney(slice.value)}
                  {slice.count != null ? ` · ${formatNumber(slice.count)} orders` : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
