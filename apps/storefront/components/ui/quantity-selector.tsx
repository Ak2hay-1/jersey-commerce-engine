'use client';

import { cn } from '@jersey-commerce/ui';
import { Minus, Plus } from 'lucide-react';

export function QuantitySelector({
  value,
  min = 1,
  max = 99,
  disabled,
  onChange,
  size = 'lg',
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  size?: 'sm' | 'lg';
}): React.JSX.Element {
  const button = cn(
    'flex cursor-pointer items-center justify-center text-foreground/80 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35',
    size === 'lg' ? 'h-full w-11' : 'h-full w-9',
  );
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--radius)] border border-white/15 bg-[hsl(var(--surface-1))]',
        size === 'lg' ? 'h-[3.25rem]' : 'h-10',
      )}
    >
      <button
        type="button"
        className={button}
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={cn('tabular text-center text-sm font-semibold', size === 'lg' ? 'min-w-8' : 'min-w-6')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
