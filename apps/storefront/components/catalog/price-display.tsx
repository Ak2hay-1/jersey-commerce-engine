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
  const onSale = Boolean(price && discountPercent(price, compareAt));
  const compareFormatted = onSale && compareAt ? formatMoney(compareAt, currency) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {compareFormatted ? (
        <span
          className={cn('text-muted-foreground line-through', {
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg',
          })}
        >
          {compareFormatted}
        </span>
      ) : null}
      <span
        className={cn('font-heading font-semibold tracking-wide text-foreground', {
          'text-sm': size === 'sm',
          'text-lg': size === 'md',
          'text-2xl': size === 'lg',
        })}
      >
        {formatted || 'Price unavailable'}
      </span>
      {onSale ? (
        <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium leading-none text-background">Sale</span>
      ) : null}
    </div>
  );
}
