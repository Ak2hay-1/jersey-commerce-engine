'use client';

import { useState, type ReactNode } from 'react';
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

interface ConfirmActionProps {
  triggerLabel: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}

export function ConfirmAction({
  triggerLabel,
  title,
  description,
  confirmLabel = 'Confirm',
  requireReason = false,
  reasonLabel = 'Reason',
  variant = 'destructive',
  disabled,
  onConfirm,
}: ConfirmActionProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleConfirm(): Promise<void> {
    if (requireReason && !reason.trim()) {
      setLocalError('A reason is required.');
      return;
    }
    setBusy(true);
    setLocalError('');
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={variant} disabled={disabled} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {requireReason ? (
          <div>
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Input
              id="confirm-reason"
              className="mt-1"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}
        {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant={variant === 'outline' ? 'default' : variant} disabled={busy} onClick={() => void handleConfirm()}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FormError({ children }: { children: ReactNode }): React.JSX.Element | null {
  if (!children) {
    return null;
  }
  return <p className="text-sm text-destructive">{children}</p>;
}

export const selectClassName =
  'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm';
