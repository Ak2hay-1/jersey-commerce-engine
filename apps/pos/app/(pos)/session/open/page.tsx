'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { PageHeader } from '@/components/page-header';
import { openSession } from '@/lib/pos-api';
import { usePosSession } from '@/lib/session';

export default function OpenSessionPage(): React.JSX.Element {
  const router = useRouter();
  const { refresh } = usePosSession();
  const [openingCash, setOpeningCash] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await openSession({ openingCash, notes: notes.trim() || undefined });
      await refresh();
      router.replace('/register');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open the register');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Open register" description="Record opening cash as till float. This is not sales revenue." />
      <Card>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="openingCash">Opening cash</Label>
              <Input
                id="openingCash"
                inputMode="decimal"
                className="mt-1 h-11"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" className="mt-1 h-11" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={submitting}>
              {submitting ? 'Opening…' : 'Open register'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
