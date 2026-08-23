'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input, type InputProps } from './input';

export type PasswordInputProps = Omit<InputProps, 'type'>;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-10', className)}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
