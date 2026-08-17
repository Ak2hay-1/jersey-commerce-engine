import { cn } from '@jersey-commerce/ui';

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      role="status"
      className={cn('border px-4 py-3 text-sm', {
        'border-border bg-muted/50': tone === 'info',
        'border-amber-300 bg-amber-50 text-amber-950': tone === 'warning',
        'border-destructive/40 bg-destructive/10 text-destructive': tone === 'danger',
        'border-emerald-300 bg-emerald-50 text-emerald-950': tone === 'success',
      })}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? 'mt-1' : undefined}>{children}</div>
    </div>
  );
}
