'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import type { PosSaleDto, RestockDisposition } from '@jersey-commerce/types';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ReceiptDialog } from '@/components/receipt-dialog';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { cancelSale, getSale, refundSale } from '@/lib/pos-api';

function remainingQuantity(sale: PosSaleDto, itemId: string, sold: number): number {
  const refunded = sale.refunds
    .filter((refund) => refund.status === 'COMPLETED')
    .flatMap((refund) => refund.items)
    .filter((item) => item.saleItemId === itemId)
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, sold - refunded);
}

export default function SaleDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const auth = useAuth();
  const [sale, setSale] = useState<PosSaleDto | null>(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, RestockDisposition>>({});
  const [confirmed, setConfirmed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    void getSale(params.id)
      .then((next) => {
        setSale(next);
        setQuantities(
          Object.fromEntries(next.items.map((item) => [item.id, remainingQuantity(next, item.id, item.quantity)])),
        );
        setRestock(Object.fromEntries(next.items.map((item) => [item.id, 'RESTOCK' as RestockDisposition])));
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  const canRefund =
    Boolean(sale) &&
    auth.can('sales.refund') &&
    (sale?.status === 'COMPLETED' || sale?.status === 'PARTIALLY_REFUNDED');
  const canCancel = Boolean(sale) && auth.can('sales.cancel') && sale?.status === 'COMPLETED' && (sale.refunds.length ?? 0) === 0;

  const remainingItems = useMemo(() => {
    if (!sale) {
      return [];
    }
    return sale.items.filter((item) => remainingQuantity(sale, item.id, item.quantity) > 0);
  }, [sale]);

  async function reload(): Promise<void> {
    const next = await getSale(params.id);
    setSale(next);
  }

  async function onRefund(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!sale) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const items = remainingItems
        .map((item) => ({
          saleItemId: item.id,
          quantity: quantities[item.id] ?? 0,
          restock: restock[item.id] ?? 'RESTOCK',
        }))
        .filter((item) => item.quantity > 0);
      await refundSale(sale.id, { reason, items: items.length ? items : undefined, confirmed });
      setReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  async function onCancel(): Promise<void> {
    if (!sale) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await cancelSale(sale.id, { reason: reason || 'Cancelled from POS' });
      setReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (!sale && !error) {
    return <p className="text-sm text-muted-foreground">Loading sale…</p>;
  }
  if (!sale) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={sale.invoiceNumber}
        description={`${sale.customer?.name ?? 'Walk-in'} · ${formatDateTime(sale.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{statusLabel(sale.status)}</Badge>
            <Button type="button" variant="outline" onClick={() => setReceiptOpen(true)}>
              Receipt
            </Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Customer</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <p>{sale.customer?.name ?? 'Walk-in'}</p>
            <p className="text-muted-foreground">{sale.customer?.phone ?? '—'}</p>
            <p className="mt-2">Cashier {sale.cashier?.name ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Totals</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0 text-sm md:grid-cols-4">
            <div>
              Subtotal
              <br />
              <span className="font-medium">{formatMoney(sale.subtotal)}</span>
            </div>
            <div>
              Discount
              <br />
              <span className="font-medium">{formatMoney(sale.discount)}</span>
            </div>
            <div>
              Tax
              <br />
              <span className="font-medium">{formatMoney(sale.tax)}</span>
            </div>
            <div>
              Total
              <br />
              <span className="font-medium">{formatMoney(sale.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <DataTable
        caption="Sale items"
        rows={sale.items}
        columns={[
          { key: 'name', header: 'Item', render: (row) => row.productName ?? '—' },
          { key: 'sku', header: 'SKU', hideOnMobile: true, render: (row) => row.sku ?? '—' },
          { key: 'qty', header: 'Qty', render: (row) => row.quantity },
          { key: 'price', header: 'Price', render: (row) => formatMoney(row.unitPrice) },
          { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
        ]}
      />
      <DataTable
        caption="Payments"
        rows={sale.payments}
        columns={[
          { key: 'method', header: 'Method', render: (row) => row.method },
          { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
          { key: 'recv', header: 'Received', hideOnMobile: true, render: (row) => (row.amountReceived ? formatMoney(row.amountReceived) : '—') },
          { key: 'chg', header: 'Change', hideOnMobile: true, render: (row) => (row.changeDue ? formatMoney(row.changeDue) : '—') },
          { key: 'st', header: 'Status', render: (row) => row.status },
        ]}
      />
      {sale.refunds.length > 0 ? (
        <DataTable
          caption="Refunds"
          rows={sale.refunds}
          columns={[
            { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
            { key: 'reason', header: 'Reason', render: (row) => row.reason },
            { key: 'st', header: 'Status', render: (row) => row.status },
            { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
          ]}
        />
      ) : null}
      {canRefund || canCancel ? (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Refund or cancel</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <form className="space-y-3" onSubmit={(event) => void onRefund(event)}>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" className="mt-1 h-11" value={reason} onChange={(e) => setReason(e.target.value)} required={canRefund} />
              </div>
              {canRefund
                ? remainingItems.map((item) => (
                    <div key={item.id} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_6rem_8rem]">
                      <p className="text-sm">
                        {item.productName} · remaining {remainingQuantity(sale, item.id, item.quantity)}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        max={remainingQuantity(sale, item.id, item.quantity)}
                        className="h-11"
                        value={quantities[item.id] ?? 0}
                        onChange={(e) =>
                          setQuantities((current) => ({ ...current, [item.id]: Number(e.target.value) }))
                        }
                      />
                      <select
                        className="h-11 rounded-md border bg-transparent px-2 text-sm"
                        value={restock[item.id] ?? 'RESTOCK'}
                        onChange={(e) =>
                          setRestock((current) => ({ ...current, [item.id]: e.target.value as RestockDisposition }))
                        }
                      >
                        <option value="RESTOCK">Restock</option>
                        <option value="DAMAGE">Damage</option>
                        <option value="NONE">Keep</option>
                      </select>
                    </div>
                  ))
                : null}
              {canRefund ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  Confirm electronic refunds
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {canRefund ? (
                  <Button type="submit" className="h-11" disabled={busy || !reason.trim()}>
                    {busy ? 'Refunding…' : 'Refund'}
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button type="button" variant="destructive" className="h-11" disabled={busy} onClick={() => void onCancel()}>
                    Cancel sale
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} sale={sale} onNewSale={() => setReceiptOpen(false)} />
    </div>
  );
}
