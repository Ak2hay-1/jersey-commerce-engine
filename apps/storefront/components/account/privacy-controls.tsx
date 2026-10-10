'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { storeApi } from '../../lib/api';
import { publicErrorMessage } from '../../lib/errors';

export function PrivacyControls(): React.JSX.Element {
  const router = useRouter();
  const { customer, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [erasing, setErasing] = useState(false);

  if (!customer) {
    return <></>;
  }

  async function downloadData() {
    setExporting(true);
    setError(null);
    try {
      const data = await storeApi.exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `jerzyfy-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not prepare your data download.'));
    } finally {
      setExporting(false);
    }
  }

  async function eraseAccount() {
    setErasing(true);
    setError(null);
    try {
      await storeApi.eraseAccount();
      logout();
      router.replace('/');
      router.refresh();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not delete your account.'));
      setErasing(false);
    }
  }

  return (
    <section className="panel w-full max-w-2xl space-y-4 p-5 sm:p-8" aria-labelledby="privacy-heading">
      <div className="space-y-1">
        <h2 id="privacy-heading" className="font-display text-2xl">
          Your data
        </h2>
        <p className="text-sm text-muted-foreground">
          Download a copy of your personal data or delete your account. See our{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <button type="button" className="btn btn-secondary w-full cursor-pointer" onClick={downloadData} disabled={exporting}>
        {exporting ? 'Preparing…' : 'Download my data'}
      </button>
      {confirming ? (
        <div className="space-y-3 rounded-lg border border-red-500/40 p-4">
          <p className="text-sm">
            This removes your name, contact details and saved address, and signs you out. Past orders and invoices are
            kept for tax records. This cannot be undone. Type <strong>DELETE</strong> to confirm.
          </p>
          <input
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1 cursor-pointer bg-red-600 hover:bg-red-700"
              onClick={eraseAccount}
              disabled={erasing || confirmText !== 'DELETE'}
            >
              {erasing ? 'Deleting…' : 'Permanently delete account'}
            </button>
            <button
              type="button"
              className="btn btn-ghost cursor-pointer"
              onClick={() => {
                setConfirming(false);
                setConfirmText('');
              }}
              disabled={erasing}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost w-full cursor-pointer text-red-600" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      )}
    </section>
  );
}
