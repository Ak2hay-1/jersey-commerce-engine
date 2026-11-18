'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '@/lib/format';

export function PurchaseAnalyticsChart({
  sold,
  purchased,
}: {
  sold: number;
  purchased: number;
}): React.JSX.Element {
  if (sold <= 0 && purchased <= 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No sold vs purchased totals for this period.
      </p>
    );
  }

  const data = [
    { name: 'Sold', value: sold, fill: 'hsl(var(--erp-orange))' },
    { name: 'Purchased', value: purchased, fill: 'hsl(var(--erp-cyan))' },
  ];

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{
              borderRadius: 16,
              border: 'none',
              boxShadow: 'var(--erp-shadow)',
            }}
          />
          <Bar dataKey="value" radius={[12, 12, 12, 12]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
