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
} from '@jersey-commerce/ui';
import type { PosSaleDto } from '@jersey-commerce/types';
import { getSaleReceipt } from '@/lib/pos-api';

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !sale) {
      return;
    }
    setHtml('');
    setError('');
    void getSaleReceipt(sale.id, 'thermal')
      .then((receipt) => setHtml(receipt.html ?? ''))
      .catch((err: Error) => setError(err.message));
  }, [open, sale]);

  function printReceipt(): void {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
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
        <DialogFooter>
          <Button type="button" variant="outline" onClick={printReceipt} disabled={!html}>
            Print
          </Button>
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
