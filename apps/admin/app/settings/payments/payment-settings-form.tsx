'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@jersey-commerce/ui';
import type { PaymentSettings } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

function emptyToKeep(value: string, currentlySet: boolean): string | null | undefined {
  if (!value.trim()) {
    return currentlySet ? '' : undefined;
  }
  return value.trim();
}

export function PaymentSettingsForm(): React.JSX.Element {
  const auth = useAuth();
  const canManage = auth.can('settings.manage');
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        const next = await apiRequest<PaymentSettings>('/payment-settings');
        if (!cancelled) {
          setSettings(next);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load payment settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(): Promise<void> {
    if (!canManage || !settings) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiRequest<PaymentSettings>('/payment-settings', {
        method: 'PUT',
        body: JSON.stringify({
          razorpayEnabled: settings.razorpayEnabled,
          razorpayKeyId: settings.razorpayKeyId,
          razorpayKeySecret: emptyToKeep(razorpayKeySecret, settings.hasRazorpayKeySecret),
        }),
      });
      setSettings(updated);
      setRazorpayKeySecret('');
      setNotice('Payment settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save payment settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading payment settings…</p>;
  }

  if (!settings) {
    return <p className="text-sm text-destructive">{error || 'Payment settings are unavailable.'}</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm">Razorpay</CardTitle>
            {settings.razorpayEnabled && settings.razorpayKeyId ? (
              <Badge variant="secondary">Enabled on storefront</Badge>
            ) : (
              <Badge variant="outline">Not active</Badge>
            )}
          </div>
          <CardDescription>
            Accept online payments on checkout. Customers pay with UPI, cards, and net banking through Razorpay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {!settings.secretsEncryptionConfigured ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Set SECRETS_ENCRYPTION_KEY on the API server before saving the key secret.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.razorpayEnabled}
              disabled={!canManage}
              onChange={(event) => setSettings((current) => (current ? { ...current, razorpayEnabled: event.target.checked } : current))}
            />
            Enable Razorpay checkout
          </label>
          <label className="block text-sm">
            Key ID
            <input
              className={fieldClass}
              value={settings.razorpayKeyId ?? ''}
              disabled={!canManage}
              placeholder="rzp_live_… or rzp_test_…"
              onChange={(event) => setSettings((current) => (current ? { ...current, razorpayKeyId: event.target.value } : current))}
            />
          </label>
          <label className="block text-sm">
            Key secret
            <input
              type="password"
              className={fieldClass}
              value={razorpayKeySecret}
              disabled={!canManage}
              placeholder={settings.hasRazorpayKeySecret ? 'Leave blank to keep current secret' : 'Enter key secret'}
              onChange={(event) => setRazorpayKeySecret(event.target.value)}
            />
          </label>
        </CardContent>
        {canManage ? (
          <CardFooter className="p-4 pt-0">
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save payment settings'}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
