import { cn } from '@jersey-commerce/ui';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return <input className={cn('field', className)} {...props} />;
}
