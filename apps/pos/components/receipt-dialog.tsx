'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@jersey-commerce/ui';
import type { PosReceiptResponse, PosSaleDto, ReceiptPayload } from '@jersey-commerce/types';
import { getSaleReceipt } from '@/lib/pos-api';

function digitsOnlyPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

function formatReceiptDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function buildWhatsAppReceiptText(payload: ReceiptPayload): string {
  const lines: string[] = [
    `*${payload.business.name}*`,
    `Invoice: ${payload.transaction.invoiceNumber}`,
    `Date: ${formatReceiptDateTime(payload.transaction.datetime)}`,
  ];
  if (payload.transaction.customerName) {
    lines.push(`Customer: ${payload.transaction.customerName}`);
  }
  lines.push('');
  for (const item of payload.items) {
    const variant = item.variant ? ` (${item.variant})` : '';
    lines.push(`${item.productName}${variant}`);
    lines.push(`  ${item.quantity} × ${item.unitPrice} = ${item.lineTotal}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${payload.totals.subtotal}`);
  if (payload.totals.discount !== '0.00') {
    lines.push(`Discount: ${payload.totals.discount}`);
  }
  lines.push(`*Total: ${payload.business.currency} ${payload.totals.total}*`);
  for (const payment of payload.payments) {
    lines.push(`Paid via ${payment.method}: ${payment.amount}`);
  }
  lines.push('');
  lines.push('Thank you for shopping with Jerzyfy!');
  return lines.join('\n');
}

export function ReceiptDialog({
  open,
  onOpenChange,
  sale,
  onNewSale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: PosSaleDto | null;
  onNewSale: () => void;
}): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState('');
  const [payload, setPayload] = useState<ReceiptPayload | null>(null);
  const [error, setError] = useState('');
  const [phonePrompt, setPhonePrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    if (!open || !sale) {
      return;
    }
    setHtml('');
    setPayload(null);
    setError('');
    setPhonePrompt(false);
    setPhoneInput(sale.customer?.phone ?? '');
    void getSaleReceipt(sale.id, 'thermal')
      .then((receipt: PosReceiptResponse) => {
        setHtml(receipt.html ?? '');
        setPayload(receipt.data);
        if (receipt.data.transaction.customerPhone) {
          setPhoneInput(receipt.data.transaction.customerPhone);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [open, sale]);

  function printReceipt(): void {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function openWhatsApp(phone: string): void {
    if (!payload) {
      return;
    }
    const digits = digitsOnlyPhone(phone);
    if (digits.length < 10) {
      setError('Enter a valid WhatsApp number (10+ digits).');
      return;
    }
    const text = buildWhatsAppReceiptText(payload);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setPhonePrompt(false);
    setError('');
  }

  function onSendWhatsApp(): void {
    if (!payload) {
      return;
    }
    const existing = payload.transaction.customerPhone || phoneInput;
    if (existing && digitsOnlyPhone(existing).length >= 10) {
      openWhatsApp(existing);
      return;
    }
    setPhonePrompt(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sale complete</DialogTitle>
          <DialogDescription>
            {sale ? `${sale.invoiceNumber} · ${sale.customer?.name ?? 'Walk-in'}` : 'Receipt'}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {html ? (
          <iframe
            ref={iframeRef}
            title="Receipt"
            srcDoc={html}
            className="h-[28rem] w-full rounded-md border bg-white"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading receipt…</p>
        )}
        {phonePrompt ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium" htmlFor="wa-phone">
                WhatsApp number
              </label>
              <Input
                id="wa-phone"
                inputMode="tel"
                placeholder="9876543210"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
              />
            </div>
            <Button type="button" onClick={() => openWhatsApp(phoneInput)} disabled={!payload}>
              Open WhatsApp
            </Button>
          </div>
        ) : null}
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={printReceipt} disabled={!html}>
              Print
            </Button>
            <Button type="button" variant="outline" onClick={onSendWhatsApp} disabled={!payload}>
              Send on WhatsApp
            </Button>
          </div>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onNewSale();
            }}
          >
            New sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
