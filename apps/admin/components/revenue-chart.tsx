'use client';

import type { RevenuePoint } from '@jersey-commerce/types';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/format';

export function RevenueChart({ points }: { points: RevenuePoint[] }): React.JSX.Element {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No revenue in this period.</p>;
  }

  const data = points.map((point) => ({
    label: point.label,
    revenue: Number(point.revenue) || 0,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="erpRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--erp-purple))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--erp-purple))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{ borderRadius: 16, border: 'none', boxShadow: 'var(--erp-shadow)' }}
          />
          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--erp-purple))" fill="url(#erpRevenueFill)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
