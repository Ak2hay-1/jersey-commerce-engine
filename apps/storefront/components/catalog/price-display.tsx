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
  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-base',
  }[size];

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', textSize)}>
      {compareFormatted ? (
        <span className="text-muted-foreground line-through decoration-muted-foreground/70">{compareFormatted}</span>
      ) : null}
      <span className={cn('font-medium text-foreground', onSale ? '' : size === 'lg' ? 'text-xl' : '')}>
        {formatted || 'Price unavailable'}
      </span>
      {onSale ? (
        <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-background">
          Sale
        </span>
      ) : null}
    </div>
  );
}
