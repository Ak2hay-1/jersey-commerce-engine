'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@jersey-commerce/ui';
import type { ShippingSettings } from '@jersey-commerce/types';
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

export function ShippingSettingsForm(): React.JSX.Element {
  const auth = useAuth();
  const canManage = auth.can('settings.manage');
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [apiToken, setApiToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        const next = await apiRequest<ShippingSettings>('/shipping-settings');
        if (!cancelled) {
          setSettings(next);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load shipping settings.');
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
      const updated = await apiRequest<ShippingSettings>('/shipping-settings', {
        method: 'PUT',
        body: JSON.stringify({
          delhiveryEnabled: settings.delhiveryEnabled,
          delhiveryApiToken: emptyToKeep(apiToken, settings.hasDelhiveryApiToken),
          delhiveryEnvironment: settings.delhiveryEnvironment,
          delhiveryServiceMode: settings.delhiveryServiceMode,
          codEnabled: settings.codEnabled,
          defaultPackageWeightKg: settings.defaultPackageWeightKg,
          warehouseName: settings.warehouseName,
          warehousePhone: settings.warehousePhone,
          warehouseAddress: settings.warehouseAddress,
          warehouseCity: settings.warehouseCity,
          warehouseState: settings.warehouseState,
          warehousePostalCode: settings.warehousePostalCode,
          warehouseCountry: settings.warehouseCountry,
          pickupLocation: settings.pickupLocation,
          webhookSecret: emptyToKeep(webhookSecret, settings.hasWebhookSecret),
        }),
      });
      setSettings(updated);
      setApiToken('');
      setWebhookSecret('');
      setNotice('Shipping settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save shipping settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading shipping settings…</p>;
  }
  if (!settings) {
    return <p className="text-sm text-destructive">{error || 'Shipping settings unavailable.'}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delhivery</CardTitle>
        <CardDescription>
          Create shipments, rate quotes, pincode checks, and COD from Jerzyfy Admin and storefront.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground md:col-span-2">{notice}</p> : null}
        {!settings.secretsEncryptionConfigured ? (
          <p className="text-sm text-amber-700 md:col-span-2">
            Set SECRETS_ENCRYPTION_KEY on the API to store Delhivery tokens encrypted.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={settings.delhiveryEnabled}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, delhiveryEnabled: e.target.checked })}
          />
          Enable Delhivery
          {settings.hasDelhiveryApiToken ? <Badge variant="secondary">Token set</Badge> : null}
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={settings.codEnabled}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, codEnabled: e.target.checked })}
          />
          Offer cash on delivery (COD)
        </label>
        <div>
          <label className="text-sm font-medium">API token</label>
          <input
            className={fieldClass}
            type="password"
            value={apiToken}
            disabled={!canManage}
            placeholder={settings.hasDelhiveryApiToken ? '•••••••• (leave blank to keep)' : 'Delhivery API token'}
            onChange={(e) => setApiToken(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Webhook secret</label>
          <input
            className={fieldClass}
            type="password"
            value={webhookSecret}
            disabled={!canManage}
            placeholder={settings.hasWebhookSecret ? '•••••••• (leave blank to keep)' : 'Optional webhook secret'}
            onChange={(e) => setWebhookSecret(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Environment</label>
          <select
            className={fieldClass}
            value={settings.delhiveryEnvironment}
            disabled={!canManage}
            onChange={(e) =>
              setSettings({
                ...settings,
                delhiveryEnvironment: e.target.value as ShippingSettings['delhiveryEnvironment'],
              })
            }
          >
            <option value="STAGING">Staging</option>
            <option value="PRODUCTION">Production</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Default service</label>
          <select
            className={fieldClass}
            value={settings.delhiveryServiceMode}
            disabled={!canManage}
            onChange={(e) =>
              setSettings({
                ...settings,
                delhiveryServiceMode: e.target.value as ShippingSettings['delhiveryServiceMode'],
              })
            }
          >
            <option value="SURFACE">Surface</option>
            <option value="EXPRESS">Express</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Default package weight (kg)</label>
          <input
            className={fieldClass}
            value={settings.defaultPackageWeightKg}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, defaultPackageWeightKg: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pickup location name</label>
          <input
            className={fieldClass}
            value={settings.pickupLocation ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, pickupLocation: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Warehouse name</label>
          <input
            className={fieldClass}
            value={settings.warehouseName ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehouseName: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Warehouse phone</label>
          <input
            className={fieldClass}
            value={settings.warehousePhone ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehousePhone: e.target.value || null })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Warehouse address</label>
          <input
            className={fieldClass}
            value={settings.warehouseAddress ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehouseAddress: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">City</label>
          <input
            className={fieldClass}
            value={settings.warehouseCity ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehouseCity: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">State</label>
          <input
            className={fieldClass}
            value={settings.warehouseState ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehouseState: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pincode</label>
          <input
            className={fieldClass}
            value={settings.warehousePostalCode ?? ''}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehousePostalCode: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Country</label>
          <input
            className={fieldClass}
            value={settings.warehouseCountry}
            disabled={!canManage}
            onChange={(e) => setSettings({ ...settings, warehouseCountry: e.target.value || 'IN' })}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button type="button" disabled={!canManage || saving} onClick={() => void onSave()}>
          {saving ? 'Saving…' : 'Save shipping settings'}
        </Button>
      </CardFooter>
    </Card>
  );
}
