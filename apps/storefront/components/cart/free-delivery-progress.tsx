import { Truck } from 'lucide-react';
import { formatMoney } from '../../lib/format';

export const FREE_DELIVERY_THRESHOLD = 2000;

export function FreeDeliveryProgress({ subtotal, currency }: { subtotal: string | number; currency: string }): React.JSX.Element {
  const value = Number(subtotal) || 0;
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - value);
  const progress = Math.min(100, (value / FREE_DELIVERY_THRESHOLD) * 100);
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Truck className="h-4 w-4 shrink-0 text-foreground/80" aria-hidden />
        {remaining > 0 ? (
          <span>
            Add <span className="font-semibold text-foreground">{formatMoney(String(remaining), currency)}</span> more for free delivery
          </span>
        ) : (
          <span className="font-medium text-emerald-300">You’ve unlocked free delivery</span>
        )}
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className={remaining > 0 ? 'h-full rounded-full bg-[hsl(var(--accent))] transition-[width] duration-500' : 'h-full rounded-full bg-emerald-400 transition-[width] duration-500'}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
