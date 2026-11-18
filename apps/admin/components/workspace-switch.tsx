'use client';

import { cn } from '@jersey-commerce/ui';
import type { StaffWorkspace } from '@jersey-commerce/types';

export function WorkspaceSwitch({
  active,
  onChange,
  showErp = true,
  showWebsite = true,
  className,
}: {
  active: StaffWorkspace;
  onChange: (workspace: StaffWorkspace) => void;
  showErp?: boolean;
  showWebsite?: boolean;
  className?: string;
}): React.JSX.Element | null {
  if (!showErp && !showWebsite) {
    return null;
  }
  if (!showErp || !showWebsite) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-1 rounded-full border border-border/70 bg-muted/70 p-0.5',
        className,
      )}
      role="group"
      aria-label="Workspace"
    >
      <button
        type="button"
        className={cn(
          'flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active === 'erp'
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-pressed={active === 'erp'}
        onClick={() => onChange('erp')}
      >
        ERP
      </button>
      <button
        type="button"
        className={cn(
          'flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active === 'admin'
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-pressed={active === 'admin'}
        onClick={() => onChange('admin')}
      >
        Website
      </button>
    </div>
  );
}
