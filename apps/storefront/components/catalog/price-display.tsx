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
  const discount = price ? discountPercent(price, compareAt) : null;
  const compareFormatted = discount && compareAt ? formatMoney(compareAt, currency) : null;
  const priceSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-[2rem] md:text-4xl',
  }[size];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={cn('tabular font-heading font-bold leading-none tracking-wide text-foreground', priceSize)}>
        {formatted || 'Price unavailable'}
      </span>
      {compareFormatted ? (
        <span className={cn('tabular text-muted-foreground line-through', size === 'sm' ? 'text-xs' : 'text-base')}>
          {compareFormatted}
        </span>
      ) : null}
      {discount ? <span className="badge badge-sale">Save {discount}%</span> : null}
    </div>
  );
}
