'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import { PageHeader } from '@/components/page-header';
import { formatMoney, moneyString, parseMoney } from '@/lib/format';
import { closeSession, getCart, listHeldCarts } from '@/lib/pos-api';
import { usePosSession } from '@/lib/session';

export default function CloseSessionPage(): React.JSX.Element {
  const router = useRouter();
  const { session, refresh } = usePosSession();
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [blocker, setBlocker] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      setClosingCash(session.expectedCash);
    }
  }, [session]);

  useEffect(() => {
    void Promise.all([getCart(), listHeldCarts()])
      .then(([cart, held]) => {
        if (held.items.length > 0) {
          setBlocker(`Clear ${held.items.length} held cart(s) before closing.`);
          return;
        }
        if (cart && cart.items.length > 0) {
          setBlocker('The active cart still has items. Clear or complete it before closing.');
          return;
        }
        setBlocker('');
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (!session) {
    return <p className="text-sm text-muted-foreground">No open session.</p>;
  }

  const sessionId = session.id;
  const variance = parseMoney(closingCash) - parseMoney(session.expectedCash);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await closeSession(sessionId, { closingCash, notes: notes.trim() || undefined });
      await refresh();
      router.replace('/session/open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to close the register');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Close register" description="Count the drawer against expected cash, then freeze this session." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs uppercase text-muted-foreground">Opening</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-lg font-semibold">{formatMoney(session.openingCash)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs uppercase text-muted-foreground">Cash sales</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-lg font-semibold">{formatMoney(session.cashSales)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs uppercase text-muted-foreground">Cash refunds</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-lg font-semibold">{formatMoney(session.cashRefunds)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs uppercase text-muted-foreground">Expected cash</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-lg font-semibold">{formatMoney(session.expectedCash)}</CardContent>
        </Card>
      </div>
      {blocker ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {blocker}{' '}
          <Link href="/held" className="underline">
            Held carts
          </Link>
          {' · '}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      ) : null}
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="closingCash">Closing cash counted</Label>
              <Input
                id="closingCash"
                inputMode="decimal"
                className="mt-1 h-11"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                required
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Variance {variance === 0 ? formatMoney(0) : `${variance > 0 ? '+' : ''}${formatMoney(moneyString(variance))}`}
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" className="mt-1 h-11" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={submitting || Boolean(blocker)}>
              {submitting ? 'Closing…' : 'Close register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
