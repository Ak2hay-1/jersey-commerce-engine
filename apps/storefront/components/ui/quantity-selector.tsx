'use client';

import { Button, cn } from '@jersey-commerce/ui';
import { Minus, Plus } from 'lucide-react';

export function QuantitySelector({
  value,
  min = 1,
  max = 99,
  disabled,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <div className="inline-flex items-center border border-input">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-none"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className={cn('min-w-10 text-center text-sm tabular-nums')} aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-none"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
