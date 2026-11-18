'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/format';

export interface ExpensesRevenuePoint {
  label: string;
  revenue: number;
  expenses: number;
}

export function ExpensesRevenueChart({
  points,
}: {
  points: ExpensesRevenuePoint[];
}): React.JSX.Element {
  const data = points.filter((point) => point.revenue > 0 || point.expenses > 0);
  if (data.length === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No expenses or revenue in this period.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0))}
            contentStyle={{ borderRadius: 16, border: 'none', boxShadow: 'var(--erp-shadow)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--erp-purple))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--erp-orange))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
