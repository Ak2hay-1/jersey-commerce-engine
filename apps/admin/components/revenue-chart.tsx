'use client';

import type { RevenuePoint } from '@jersey-commerce/types';
import { formatMoney } from '@/lib/format';

export function RevenueChart({ points }: { points: RevenuePoint[] }): React.JSX.Element {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No revenue in this period.</p>;
  }
  const values = points.map((point) => Number(point.revenue));
  const max = Math.max(...values, 1);
  const height = 180;
  const width = Math.max(points.length * 48, 320);
  const barWidth = Math.max(12, Math.min(28, width / points.length - 8));
  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Revenue over time"
        viewBox={`0 0 ${width} ${height + 36}`}
        className="h-56 w-full min-w-[320px]"
      >
        {points.map((point, index) => {
          const barHeight = (Number(point.revenue) / max) * height;
          const x = index * (width / points.length) + 8;
          const y = height - barHeight;
          return (
            <g key={point.bucket}>
              <title>{`${point.label}: ${formatMoney(point.revenue)}`}</title>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" className="fill-primary/80" />
              <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
