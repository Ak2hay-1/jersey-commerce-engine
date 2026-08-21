'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@jersey-commerce/ui';
import type { PosCartDto } from '@jersey-commerce/types';
import { PageHeader } from '@/components/page-header';
import { formatDateTime, formatMoney } from '@/lib/format';
import { listHeldCarts, resumeCart } from '@/lib/pos-api';
import { useRealtimeReload } from '@/lib/realtime';

export default function HeldCartsPage(): React.JSX.Element {
  const router = useRouter();
  const [carts, setCarts] = useState<PosCartDto[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  async function reload(): Promise<void> {
    const payload = await listHeldCarts();
    setCarts(payload.items);
  }

  useEffect(() => {
    void reload().catch((err: Error) => setError(err.message));
  }, []);

  useRealtimeReload(
    (event) => event.entity === 'PosCart' || event.entity === 'PosCartItem',
    () => reload().catch((err: Error) => setError(err.message)),
  );

  async function resume(id: string): Promise<void> {
    setBusyId(id);
    setError('');
    try {
      await resumeCart(id);
      router.push('/register');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resume cart');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Held carts" description="Parked carts do not reserve stock. Resume one to make it the active sale." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {carts.length === 0 ? <p className="text-sm text-muted-foreground">No held carts.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {carts.map((cart) => (
          <Card key={cart.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{cart.customer?.name ?? 'Walk-in'}</p>
                  <p className="text-xs text-muted-foreground">
                    {cart.items.length} line(s) · held {formatDateTime(cart.heldAt)}
                  </p>
                </div>
                <p className="font-semibold">{formatMoney(cart.total)}</p>
              </div>
              <ul className="text-sm text-muted-foreground">
                {cart.items.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.productName}
                  </li>
                ))}
              </ul>
              <Button type="button" className="h-11 w-full" disabled={busyId === cart.id} onClick={() => void resume(cart.id)}>
                {busyId === cart.id ? 'Resuming…' : 'Resume'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
