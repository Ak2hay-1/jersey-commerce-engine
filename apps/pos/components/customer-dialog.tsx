'use client';

import { useState } from 'react';
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
import type { CustomerSummary, PosCartDto, PosNewCustomerInput } from '@jersey-commerce/types';
import { searchCustomers } from '@/lib/pos-api';

export function CustomerDialog({
  open,
  onOpenChange,
  cart,
  canCreate,
  onWalkIn,
  onAttach,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: PosCartDto | null;
  canCreate: boolean;
  onWalkIn: () => Promise<void>;
  onAttach: (customerId: string) => Promise<void>;
  onCreate: (input: PosNewCustomerInput) => Promise<void>;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  async function runSearch(): Promise<void> {
    const value = query.trim();
    if (!value) {
      setResults([]);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = await searchCustomers(value);
      setResults(payload.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Customer search failed');
    } finally {
      setBusy(false);
    }
  }

  async function wrap(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await action();
      onOpenChange(false);
      setQuery('');
      setResults([]);
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update customer');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
          <DialogDescription>
            {cart?.customer ? `${cart.customer.name} · ${cart.customer.phone ?? 'no phone'}` : 'Walk-in sale'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="Search name, phone, or email"
              className="h-11"
            />
            <Button type="button" variant="outline" className="h-11" onClick={() => void runSearch()} disabled={busy}>
              Search
            </Button>
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {results.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  className="w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                  disabled={busy}
                  onClick={() => void wrap(() => onAttach(customer.id))}
                >
                  <span className="font-medium">{customer.name}</span>
                  <span className="ml-2 text-muted-foreground">{customer.phone ?? customer.email ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
          {canCreate ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">New customer</p>
              <div>
                <Label htmlFor="cust-name">Name</Label>
                <Input id="cust-name" className="mt-1 h-11" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input id="cust-phone" className="mt-1 h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cust-email">Email</Label>
                  <Input id="cust-email" className="mt-1 h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                disabled={busy || !name.trim()}
                onClick={() =>
                  void wrap(() =>
                    onCreate({
                      name: name.trim(),
                      phone: phone.trim() || undefined,
                      email: email.trim() || undefined,
                    }),
                  )
                }
              >
                Create and attach
              </Button>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => void wrap(onWalkIn)} disabled={busy}>
            Walk-in
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
