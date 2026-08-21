'use client';

import { useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import type { PublicCustomOrder } from '@jersey-commerce/types';
import { storeApi } from '../../../lib/api';
import { StoreApiError } from '../../../lib/errors';
import { formatMoney } from '../../../lib/format';
import { Alert } from '../../../components/ui/alert';

export function CustomOrderStatusView({
  initial,
  currency,
}: {
  initial: PublicCustomOrder;
  currency: string;
}): React.JSX.Element {
  const [order, setOrder] = useState(initial);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<PublicCustomOrder>) {
    setBusy(true);
    setError(null);
    try {
      setOrder(await action());
    } catch (err) {
      setError(err instanceof StoreApiError ? err.message : 'That action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-store store-gutter py-10 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{order.orderNumber}</p>
      <h1 className="mt-2 break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">{order.teamName || 'Custom jersey order'}</h1>
      <p className="mt-2 text-muted-foreground">
        Status {order.status.replaceAll('_', ' ').toLowerCase()} · Payment {order.paymentStatus.replaceAll('_', ' ').toLowerCase()}
      </p>
      {error ? (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <dl className="mt-8 grid gap-3 text-sm md:grid-cols-3">
        <Stat label="Quantity" value={String(order.estimatedQuantity || '—')} />
        <Stat label="Total" value={formatMoney(order.total, currency) || 'Quoted later'} />
        <Stat label="Balance due" value={formatMoney(order.balanceDue, currency) || '—'} />
      </dl>

      {order.currentQuote ? (
        <section className="mt-10 border border-border p-5">
          <h2 className="font-heading text-2xl uppercase tracking-wide">
            Quote {order.currentQuote.quoteNumber} v{order.currentQuote.version}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMoney(order.currentQuote.total, currency)} · deposit {formatMoney(order.currentQuote.depositRequired, currency)}
          </p>
          {order.currentQuote.acceptanceState === 'PENDING' ? (
            <Button className="mt-4" disabled={busy} onClick={() => void run(() => storeApi.acceptCustomQuote(order.publicId))}>
              Accept quote
            </Button>
          ) : (
            <p className="mt-3 text-sm">Acceptance: {order.currentQuote.acceptanceState.toLowerCase()}</p>
          )}
        </section>
      ) : null}

      {order.currentDesign ? (
        <section className="mt-6 border border-border p-5">
          <h2 className="font-heading text-2xl uppercase tracking-wide">Design v{order.currentDesign.version}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.currentDesign.approvalStatus.replaceAll('_', ' ').toLowerCase()}
          </p>
          {order.currentDesign.approvalStatus !== 'APPROVED' ? (
            <div className="mt-4 grid gap-3">
              <textarea
                className="min-h-20 w-full border border-input bg-background px-3 py-2 text-sm"
                placeholder="Comment (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => void run(() => storeApi.approveCustomDesign(order.publicId, comment))}>
                  Approve design
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => storeApi.requestCustomDesignChanges(order.publicId, comment))}
                >
                  Request changes
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {order.timeline.length ? (
        <section className="mt-10">
          <h2 className="font-heading text-2xl uppercase tracking-wide">Timeline</h2>
          <ol className="mt-4 grid gap-3">
            {order.timeline.map((event) => (
              <li key={event.id} className="border-l-2 border-accent pl-4">
                <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString('en-IN')}</p>
                <p className="font-medium">{event.title}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-2xl uppercase">{value}</dd>
    </div>
  );
}
