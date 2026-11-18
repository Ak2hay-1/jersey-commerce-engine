import type { ReactNode } from 'react';
import { cn } from '@jersey-commerce/ui';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'peach' | 'lavender' | 'mint';
  icon?: ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'erp-card p-5',
        tone === 'peach' && 'erp-stat-peach',
        tone === 'lavender' && 'erp-stat-lavender',
        tone === 'mint' && 'erp-stat-mint',
        tone === 'default' && 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          {hint ? <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-foreground shadow-sm dark:bg-white/10">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
