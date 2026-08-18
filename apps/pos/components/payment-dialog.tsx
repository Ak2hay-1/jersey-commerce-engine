'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@jersey-commerce/ui';
import { POS_TENDER_METHODS, type PosCartDto, type PosPaymentInput, type PosTenderMethod } from '@jersey-commerce/types';
import { formatMoney, moneyString, parseMoney, remainingDue } from '@/lib/format';

interface TenderRow {
  key: string;
  method: PosTenderMethod;
  amount: string;
  amountReceived: string;
  reference: string;
}

function newRow(method: PosTenderMethod, amount = ''): TenderRow {
  return {
    key: `${method}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    method,
    amount,
    amountReceived: '',
    reference: '',
  };
}

export function PaymentDialog({
  open,
  onOpenChange,
  cart,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: PosCartDto | null;
  onComplete: (payments: PosPaymentInput[]) => Promise<void>;
}): React.JSX.Element {
  const total = cart?.total ?? '0.00';
  const [rows, setRows] = useState<TenderRow[]>([newRow('CASH', total)]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const remaining = useMemo(
    () => remainingDue(total, rows.map((row) => row.amount || '0')),
    [rows, total],
  );

  useEffect(() => {
    if (open) {
      setRows([newRow('CASH', total)]);
      setError('');
    }
  }, [open, total]);

  function updateRow(key: string, patch: Partial<TenderRow>): void {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function submit(): Promise<void> {
    if (!cart) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      for (const row of rows) {
        if ((row.method === 'UPI' || row.method === 'CARD') && !row.reference.trim()) {
          throw new Error(`${row.method} requires a transaction reference.`);
        }
        if (row.method === 'CASH') {
          const amount = parseMoney(row.amount || total);
          const received = parseMoney(row.amountReceived || row.amount || total);
          if (received < amount) {
            throw new Error('Cash received must be at least the amount applied.');
          }
        }
      }
      const payments: PosPaymentInput[] = rows.map((row) => {
        const amount = row.amount || remainingDue(total, []);
        const payment: PosPaymentInput = { method: row.method, amount };
        if (row.method === 'CASH') {
          payment.amountReceived = row.amountReceived || amount;
        } else {
          payment.confirmed = true;
          if (row.reference.trim()) {
            payment.reference = row.reference.trim();
          }
        }
        return payment;
      });
      await onComplete(payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete the sale');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>Amount due {formatMoney(total)}. Split tenders must equal the total.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rows.map((row) => {
            const applied = parseMoney(row.amount || '0');
            const received = parseMoney(row.amountReceived || '0');
            const change = row.method === 'CASH' && received > applied ? moneyString(received - applied) : '0.00';
            return (
              <div key={row.key} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-11 rounded-md border bg-transparent px-2 text-sm"
                    value={row.method}
                    onChange={(event) => updateRow(row.key, { method: event.target.value as PosTenderMethod })}
                  >
                    {POS_TENDER_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-11 min-w-[8rem] flex-1"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                    placeholder="Amount"
                  />
                  {rows.length > 1 ? (
                    <Button type="button" variant="ghost" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                {row.method === 'CASH' ? (
                  <div>
                    <Label>Cash received</Label>
                    <Input
                      className="mt-1 h-11"
                      inputMode="decimal"
                      value={row.amountReceived}
                      onChange={(e) => updateRow(row.key, { amountReceived: e.target.value })}
                      placeholder={row.amount || total}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Change {formatMoney(change)}</p>
                  </div>
                ) : (
                  <div>
                    <Label>{row.method === 'OTHER' ? 'Reference (optional)' : 'Reference'}</Label>
                    <Input
                      className="mt-1 h-11"
                      value={row.reference}
                      onChange={(e) => updateRow(row.key, { reference: e.target.value })}
                      placeholder={row.method === 'UPI' ? 'UPI txn id' : 'Terminal approval'}
                      required={row.method === 'UPI' || row.method === 'CARD'}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Remaining</span>
            <span className="font-medium">{formatMoney(remaining)}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => setRows((current) => [...current, newRow('UPI', remaining === '0.00' ? '' : remaining)])}
          >
            Add split payment
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="h-11" disabled={busy || !cart} onClick={() => void submit()}>
            {busy ? 'Completing…' : 'Complete sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
