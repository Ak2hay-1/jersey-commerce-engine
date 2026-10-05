'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { useCart } from '../providers/cart-provider';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';

export function PromoCodeField(): React.JSX.Element {
  const { cart, applyPromo, removePromo } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const applied = cart?.promoCode;

  async function onApply(): Promise<void> {
    if (!code.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await applyPromo(code);
      setCode('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Promo code could not be applied.');
    } finally {
      setPending(false);
    }
  }

  async function onRemove(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      await removePromo();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Promo code could not be removed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {applied ? (
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">
          <p className="flex items-center gap-2">
            <Tag className="h-4 w-4" aria-hidden />
            <span className="font-mono font-semibold">{applied.code}</span> applied
          </p>
          <button
            type="button"
            className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-2 text-xs hover:bg-white/10 disabled:opacity-50"
            disabled={pending}
            onClick={() => void onRemove()}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Promo code"
            aria-label="Promo code"
            autoComplete="off"
            className="h-11 uppercase"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onApply();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary h-11 shrink-0 cursor-pointer px-5"
            disabled={pending || !code.trim()}
            onClick={() => void onApply()}
          >
            {pending ? 'Applying…' : 'Apply'}
          </button>
        </div>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
