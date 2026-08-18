import type { ReactNode } from 'react';
import { cn } from '@jersey-commerce/ui';

export function GlassCard({
  children,
  className,
  solid = false,
}: {
  children: ReactNode;
  className?: string;
  solid?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] p-5 shadow-luxury',
        solid ? 'border border-white/80 bg-white' : 'glass-panel',
        className,
      )}
    >
      {children}
    </div>
  );
}
