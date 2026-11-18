'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatNumber } from '@/lib/format';

export interface OrdersOverviewPoint {
  label: string;
  orders: number;
  revenue: number;
}

export function OrdersOverviewChart({ points }: { points: OrdersOverviewPoint[] }): React.JSX.Element {
  const [active, setActive] = useState<OrdersOverviewPoint | null>(null);
  const data = useMemo(
    () =>
      [...points].reverse().map((point) => ({
        ...point,
        short: point.label,
      })),
    [points],
  );

  if (data.length === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No sales in this period.</p>;
  }

  const hasOrders = data.some((point) => point.orders > 0);
  const tip = active ?? data[Math.floor(data.length / 2)] ?? null;

  return (
    <div className="relative h-64 w-full">
      {tip ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-[hsl(var(--erp-lime))] px-3 py-1 text-xs font-semibold text-[hsl(var(--erp-lime-foreground))] shadow-sm">
          {hasOrders ? `${formatNumber(tip.orders)} orders · ` : null}
          {formatMoney(tip.revenue)}
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
          onMouseMove={(state) => {
            const payload = (state as { activePayload?: Array<{ payload?: OrdersOverviewPoint }> } | null)
              ?.activePayload?.[0]?.payload;
            if (payload) {
              setActive(payload);
            }
          }}
          onMouseLeave={() => setActive(null)}
        >
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          {hasOrders ? (
            <YAxis
              yAxisId="orders"
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
          ) : null}
          <YAxis
            yAxisId="revenue"
            orientation={hasOrders ? 'right' : 'left'}
            hide={hasOrders}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <Tooltip content={() => null} />
          {hasOrders ? (
            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="hsl(var(--erp-orange))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: 'hsl(var(--erp-orange))' }}
            />
          ) : null}
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="hsl(var(--erp-purple))"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: 'hsl(var(--erp-purple))' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {hasOrders ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--erp-orange))]" /> Orders
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--erp-purple))]" /> Revenue
        </span>
      </div>
    </div>
  );
}
