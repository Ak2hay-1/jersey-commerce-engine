import { cn } from '@jersey-commerce/ui';
import { discountPercent, formatMoney } from '../../lib/format';

export function PriceDisplay({
  price,
  compareAt,
  currency = 'INR',
  size = 'md',
}: {
  price: string | null | undefined;
  compareAt?: string | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}): React.JSX.Element {
  const formatted = formatMoney(price, currency);
  const save = price ? discountPercent(price, compareAt) : null;
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={cn('font-heading font-semibold tracking-wide', {
          'text-sm': size === 'sm',
          'text-lg': size === 'md',
          'text-3xl': size === 'lg',
        })}
      >
        {formatted || 'Price unavailable'}
      </span>
      {save && compareAt ? (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatMoney(compareAt, currency)}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">{save}% off</span>
        </>
      ) : null}
    </div>
  );
}
