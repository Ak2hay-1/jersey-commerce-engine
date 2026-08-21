'use client';

import { useState } from 'react';
import { Button } from '@jersey-commerce/ui';
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
        <div className="flex items-center justify-between gap-2 text-sm">
          <p>
            Code <span className="font-mono">{applied.code}</span> applied
          </p>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void onRemove()}>
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Promo code"
            aria-label="Promo code"
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onApply();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={pending || !code.trim()} onClick={() => void onApply()}>
            {pending ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
