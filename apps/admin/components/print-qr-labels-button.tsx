'use client';

import { useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import { printQrLabels, type QrLabelItem } from '@/lib/print-qr-labels';

export function PrintQrLabelsButton({
  items,
  label = 'Print QR labels',
  disabled,
  size = 'sm',
  variant = 'outline',
}: {
  items: QrLabelItem[];
  label?: string;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onPrint(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await printQrLabels(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to print labels');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant={variant} size={size} disabled={disabled || busy || items.length === 0} onClick={() => void onPrint()}>
        {busy ? 'Preparing…' : label}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
