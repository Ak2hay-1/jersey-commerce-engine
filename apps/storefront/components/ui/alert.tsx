import { cn } from '@jersey-commerce/ui';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle2,
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const Icon = ICONS[tone];
  return (
    <div
      role="status"
      className={cn('flex gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm', {
        'border-white/10 bg-white/[0.04] text-foreground/90': tone === 'info',
        'border-amber-400/30 bg-amber-400/10 text-amber-200': tone === 'warning',
        'border-red-400/30 bg-red-500/10 text-red-200': tone === 'danger',
        'border-emerald-400/30 bg-emerald-400/10 text-emerald-200': tone === 'success',
      })}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? 'mt-1' : undefined}>{children}</div>
      </div>
    </div>
  );
}
