'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@jersey-commerce/ui';
import type { NotificationSettings } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/env';

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

function emptyToKeep(value: string, currentlySet: boolean): string | null | undefined {
  if (!value.trim()) {
    return currentlySet ? '' : undefined;
  }
  return value.trim();
}

export function NotificationSettingsForm(): React.JSX.Element {
  const auth = useAuth();
  const canManage = auth.can('settings.manage');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [msg91AuthKey, setMsg91AuthKey] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [waTesting, setWaTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        const next = await apiRequest<NotificationSettings>('/notification-settings');
        if (!cancelled) {
          setSettings({ ...next, whatsappPublicBaseUrl: next.whatsappPublicBaseUrl || getApiUrl() });
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load notification settings.');
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
      const updated = await apiRequest<NotificationSettings>('/notification-settings', {
        method: 'PUT',
        body: JSON.stringify({
          telegramEnabled: settings.telegramEnabled,
          telegramChatId: settings.telegramChatId,
          telegramBotToken: emptyToKeep(telegramBotToken, settings.hasTelegramBotToken),
          notifyOrderCreated: settings.notifyOrderCreated,
          notifyCustomOrderCreated: settings.notifyCustomOrderCreated,
          notifyPaymentConfirmed: settings.notifyPaymentConfirmed,
          notifyOrderStatusChanged: settings.notifyOrderStatusChanged,
          notifyPosSale: settings.notifyPosSale,
          whatsappEnabled: settings.whatsappEnabled,
          msg91AuthKey: emptyToKeep(msg91AuthKey, settings.hasMsg91AuthKey),
          whatsappIntegratedNumber: settings.whatsappIntegratedNumber?.trim() || null,
          whatsappTemplateName: settings.whatsappTemplateName.trim() || 'jerzyfy_receipt',
          whatsappTemplateNamespace: settings.whatsappTemplateNamespace?.trim() || null,
          whatsappTemplateLanguage: settings.whatsappTemplateLanguage.trim() || 'en',
          whatsappPublicBaseUrl: settings.whatsappPublicBaseUrl?.trim() || null,
          whatsappSendPosReceipt: settings.whatsappSendPosReceipt,
          whatsappSendOrderReceipt: settings.whatsappSendOrderReceipt,
        }),
      });
      setSettings({ ...updated, whatsappPublicBaseUrl: updated.whatsappPublicBaseUrl || getApiUrl() });
      setTelegramBotToken('');
      setMsg91AuthKey('');
      setNotice('Notification settings saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }

  async function onTest(): Promise<void> {
    if (!canManage) {
      return;
    }
    setTesting(true);
    setError('');
    setNotice('');
    try {
      await apiRequest<{ ok: true }>('/notification-settings/telegram/test', { method: 'POST', body: '{}' });
      setNotice('Test message sent. Check your Telegram chat.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send test message.');
    } finally {
      setTesting(false);
    }
  }

  async function onWhatsappTest(): Promise<void> {
    if (!canManage) {
      return;
    }
    setWaTesting(true);
    setError('');
    setNotice('');
    try {
      await apiRequest<{ ok: true }>('/notification-settings/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ phone: waTestPhone.trim() }),
      });
      setNotice('Sample bill sent. Check WhatsApp on that number.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send WhatsApp test.');
    } finally {
      setWaTesting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading notification settings…</p>;
  }

  if (!settings) {
    return <p className="text-sm text-destructive">{error || 'Notification settings are unavailable.'}</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm">Telegram</CardTitle>
            {settings.telegramEnabled && settings.hasTelegramBotToken && settings.telegramChatId ? (
              <Badge variant="secondary">Alerts enabled</Badge>
            ) : (
              <Badge variant="outline">Not active</Badge>
            )}
          </div>
          <CardDescription>
            Send staff alerts to a Telegram chat when orders, payments, and POS sales happen. Create a bot with
            @BotFather, then paste the token and your chat ID here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          {!settings.secretsEncryptionConfigured ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Set SECRETS_ENCRYPTION_KEY on the API server before saving the bot token.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.telegramEnabled}
              disabled={!canManage}
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, telegramEnabled: event.target.checked } : current))
              }
            />
            Enable Telegram alerts
          </label>
          <label className="block text-sm">
            Bot token
            <input
              type="password"
              className={fieldClass}
              value={telegramBotToken}
              disabled={!canManage}
              placeholder={settings.hasTelegramBotToken ? 'Leave blank to keep current token' : 'Enter bot token from BotFather'}
              onChange={(event) => setTelegramBotToken(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            Chat ID
            <input
              className={fieldClass}
              value={settings.telegramChatId ?? ''}
              disabled={!canManage}
              placeholder="e.g. -1001234567890 or a personal chat ID"
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, telegramChatId: event.target.value } : current))
              }
            />
          </label>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notify on</p>
            {(
              [
                ['notifyOrderCreated', 'New ecommerce orders'],
                ['notifyCustomOrderCreated', 'Custom kit enquiries'],
                ['notifyPaymentConfirmed', 'Payment confirmed'],
                ['notifyOrderStatusChanged', 'Order status changes and cancellations'],
                ['notifyPosSale', 'POS sales'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => (current ? { ...current, [key]: event.target.checked } : current))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </CardContent>
        {canManage ? (
          <CardFooter className="flex flex-wrap gap-2 p-4 pt-0">
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save notification settings'}
            </Button>
            <Button type="button" variant="outline" disabled={testing || saving} onClick={() => void onTest()}>
              {testing ? 'Sending…' : 'Send test message'}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm">WhatsApp receipts (MSG91)</CardTitle>
            {settings.whatsappEnabled && settings.hasMsg91AuthKey && settings.whatsappIntegratedNumber ? (
              <Badge variant="secondary">Auto receipts on</Badge>
            ) : (
              <Badge variant="outline">Not active</Badge>
            )}
          </div>
          <CardDescription>
            Automatically send customers their PDF bill on WhatsApp after a POS sale or when a website order is
            confirmed. The bill goes to the phone number on the sale or order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.whatsappEnabled}
              disabled={!canManage}
              onChange={(event) =>
                setSettings((current) => (current ? { ...current, whatsappEnabled: event.target.checked } : current))
              }
            />
            Enable automatic WhatsApp receipts
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              MSG91 auth key
              <input
                type="password"
                className={fieldClass}
                value={msg91AuthKey}
                disabled={!canManage}
                placeholder={settings.hasMsg91AuthKey ? 'Saved — leave blank to keep' : 'From MSG91 → Authkey'}
                onChange={(event) => setMsg91AuthKey(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Integrated WhatsApp number
              <input
                className={fieldClass}
                value={settings.whatsappIntegratedNumber ?? ''}
                disabled={!canManage}
                placeholder="e.g. 919876543210"
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, whatsappIntegratedNumber: event.target.value } : current,
                  )
                }
              />
            </label>
            <label className="block text-sm">
              Template name
              <input
                className={fieldClass}
                value={settings.whatsappTemplateName}
                disabled={!canManage}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, whatsappTemplateName: event.target.value } : current))
                }
              />
            </label>
            <label className="block text-sm">
              Template namespace
              <input
                className={fieldClass}
                value={settings.whatsappTemplateNamespace ?? ''}
                disabled={!canManage}
                placeholder="Shown on the template in MSG91"
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, whatsappTemplateNamespace: event.target.value } : current,
                  )
                }
              />
            </label>
            <label className="block text-sm">
              Template language code
              <input
                className={fieldClass}
                value={settings.whatsappTemplateLanguage}
                disabled={!canManage}
                placeholder="en"
                onChange={(event) =>
                  setSettings((current) =>
                    current ? { ...current, whatsappTemplateLanguage: event.target.value } : current,
                  )
                }
              />
            </label>
            <label className="block text-sm">
              Public API URL (for PDF links)
              <input
                className={fieldClass}
                value={settings.whatsappPublicBaseUrl ?? ''}
                disabled={!canManage}
                placeholder="https://api.example.com"
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, whatsappPublicBaseUrl: event.target.value } : current))
                }
              />
            </label>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Send automatically for</p>
            {(
              [
                ['whatsappSendPosReceipt', 'POS sales (customer phone on the sale)'],
                ['whatsappSendOrderReceipt', 'Website orders when confirmed / paid (phone in order details)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  disabled={!canManage}
                  onChange={(event) =>
                    setSettings((current) => (current ? { ...current, [key]: event.target.checked } : current))
                  }
                />
                {label}
              </label>
            ))}
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Create this template in MSG91 → WhatsApp → Templates</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                Name <code>jerzyfy_receipt</code>, category Utility, language English (<code>en</code>)
              </li>
              <li>Header: Document</li>
              <li>
                Body: <code>Hi {'{{1}}'}, thank you for shopping at Jerzyfy! Your bill {'{{2}}'} for Rs. {'{{3}}'} is attached.</code>
              </li>
              <li>Footer: Jerzyfy</li>
            </ul>
          </div>
          {canManage ? (
            <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm">
                Send a sample bill to
                <input
                  className={fieldClass}
                  inputMode="tel"
                  value={waTestPhone}
                  placeholder="9876543210"
                  onChange={(event) => setWaTestPhone(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={waTesting || saving || !waTestPhone.trim()}
                onClick={() => void onWhatsappTest()}
              >
                {waTesting ? 'Sending…' : 'Send test bill'}
              </Button>
            </div>
          ) : null}
        </CardContent>
        {canManage ? (
          <CardFooter className="p-4 pt-0">
            <Button type="button" disabled={saving} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save WhatsApp settings'}
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
