'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@jersey-commerce/ui';
import type { AuthSettings, EmailOtpProvider, SmsOtpProvider } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const fieldClass =
  'mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring';

const EMAIL_PROVIDERS: { value: EmailOtpProvider; label: string }[] = [
  { value: 'CONSOLE', label: 'Console (development — codes in API logs)' },
  { value: 'RESEND', label: 'Resend (3,000 emails/month free)' },
  { value: 'SMTP', label: 'SMTP (Brevo, Gmail app password, etc.)' },
];

const SMS_PROVIDERS: { value: SmsOtpProvider; label: string }[] = [
  { value: 'CONSOLE', label: 'Console (development — codes in API logs)' },
  { value: 'MSG91', label: 'MSG91 (low-cost India OTP)' },
  { value: 'TWILIO', label: 'Twilio (global, more expensive)' },
];

function emptyToKeep(value: string, currentlySet: boolean): string | null | undefined {
  if (!value.trim()) {
    return currentlySet ? '' : undefined;
  }
  return value.trim();
}

export function AuthenticationSettingsForm(): React.JSX.Element {
  const auth = useAuth();
  const canManage = auth.can('settings.manage');
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [resendApiKey, setResendApiKey] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'email' | 'sms' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      try {
        const next = await apiRequest<AuthSettings>('/auth-settings');
        if (!cancelled) {
          setSettings(next);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load authentication settings.');
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

  async function onSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await apiRequest<AuthSettings>('/auth-settings', {
        method: 'PUT',
        body: JSON.stringify({
          passwordLoginEnabled: settings.passwordLoginEnabled,
          emailOtpEnabled: settings.emailOtpEnabled,
          smsOtpEnabled: settings.smsOtpEnabled,
          googleSignInEnabled: settings.googleSignInEnabled,
          emailProvider: settings.emailProvider,
          emailFromAddress: settings.emailFromAddress,
          emailFromName: settings.emailFromName,
          resendApiKey: emptyToKeep(resendApiKey, settings.hasResendApiKey),
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPassword: emptyToKeep(smtpPassword, settings.hasSmtpPassword),
          smtpSecure: settings.smtpSecure,
          smsProvider: settings.smsProvider,
          smsApiKey: emptyToKeep(smsApiKey, settings.hasSmsApiKey),
          smsSenderId: settings.smsSenderId,
          twilioAccountSid: settings.twilioAccountSid,
          twilioAuthToken: emptyToKeep(twilioAuthToken, settings.hasTwilioAuthToken),
          smsFromNumber: settings.smsFromNumber,
          googleClientId: settings.googleClientId,
          googleClientSecret: emptyToKeep(googleClientSecret, settings.hasGoogleClientSecret),
          otpTtlSeconds: settings.otpTtlSeconds,
        }),
      });
      setSettings(saved);
      setResendApiKey('');
      setSmtpPassword('');
      setSmsApiKey('');
      setTwilioAuthToken('');
      setGoogleClientSecret('');
      setNotice('Authentication settings saved. Storefront login buttons update on the next page load.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save authentication settings.');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest(kind: 'email' | 'sms'): Promise<void> {
    setTesting(kind);
    setError('');
    setNotice('');
    try {
      if (kind === 'email') {
        await apiRequest('/auth-settings/test-email', { method: 'POST', body: JSON.stringify({ to: testEmail }) });
        setNotice(`Test email sent to ${testEmail}.`);
      } else {
        await apiRequest('/auth-settings/test-sms', { method: 'POST', body: JSON.stringify({ to: testPhone }) });
        setNotice(`Test SMS sent to ${testPhone}.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not send test ${kind}.`);
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading authentication settings…</p>;
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>{error || 'Authentication settings are not available for this tenant.'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void onSave(event)}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {!settings.secretsEncryptionConfigured ? (
        <p className="text-sm text-muted-foreground">
          Live providers need <code>SECRETS_ENCRYPTION_KEY</code> (32+ characters) on the API. Console mode works without it.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Password</CardTitle>
            <Badge variant={settings.passwordLoginEnabled ? 'default' : 'secondary'}>
              {settings.passwordLoginEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>Existing email and password accounts. Keep at least one method on.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.passwordLoginEnabled}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, passwordLoginEnabled: event.target.checked })}
            />
            Allow email/password sign-in and registration
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Email OTP</CardTitle>
            <Badge variant={settings.emailOtpEnabled ? 'default' : 'secondary'}>
              {settings.emailOtpEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Customers receive a 6-digit code. Create a free key at{' '}
            <a className="underline" href="https://resend.com" target="_blank" rel="noreferrer">
              resend.com
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.emailOtpEnabled}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, emailOtpEnabled: event.target.checked })}
            />
            Enable email one-time codes
          </label>
          <label className="text-sm md:col-span-2">
            Provider
            <select
              className={fieldClass}
              value={settings.emailProvider}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, emailProvider: event.target.value as EmailOtpProvider })}
            >
              {EMAIL_PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            From email
            <input
              className={fieldClass}
              type="email"
              disabled={!canManage}
              value={settings.emailFromAddress ?? ''}
              onChange={(event) => setSettings({ ...settings, emailFromAddress: event.target.value || null })}
            />
          </label>
          <label className="text-sm">
            From name
            <input
              className={fieldClass}
              disabled={!canManage}
              value={settings.emailFromName ?? ''}
              onChange={(event) => setSettings({ ...settings, emailFromName: event.target.value || null })}
            />
          </label>
          {settings.emailProvider === 'RESEND' ? (
            <label className="text-sm md:col-span-2">
              Resend API key {settings.hasResendApiKey ? '(saved)' : ''}
              <input
                className={fieldClass}
                type="password"
                autoComplete="off"
                disabled={!canManage}
                placeholder={settings.hasResendApiKey ? 'Leave blank to keep the saved key' : 're_…'}
                value={resendApiKey}
                onChange={(event) => setResendApiKey(event.target.value)}
              />
            </label>
          ) : null}
          {settings.emailProvider === 'SMTP' ? (
            <>
              <label className="text-sm">
                SMTP host
                <input
                  className={fieldClass}
                  disabled={!canManage}
                  value={settings.smtpHost ?? ''}
                  onChange={(event) => setSettings({ ...settings, smtpHost: event.target.value || null })}
                />
              </label>
              <label className="text-sm">
                SMTP port
                <input
                  className={fieldClass}
                  type="number"
                  disabled={!canManage}
                  value={settings.smtpPort ?? 587}
                  onChange={(event) => setSettings({ ...settings, smtpPort: Number(event.target.value) || null })}
                />
              </label>
              <label className="text-sm">
                SMTP username
                <input
                  className={fieldClass}
                  disabled={!canManage}
                  value={settings.smtpUser ?? ''}
                  onChange={(event) => setSettings({ ...settings, smtpUser: event.target.value || null })}
                />
              </label>
              <label className="text-sm">
                SMTP password {settings.hasSmtpPassword ? '(saved)' : ''}
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="off"
                  disabled={!canManage}
                  placeholder={settings.hasSmtpPassword ? 'Leave blank to keep' : ''}
                  value={smtpPassword}
                  onChange={(event) => setSmtpPassword(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <label className="min-w-[16rem] flex-1 text-sm">
              Send test email to
              <input
                className={fieldClass}
                type="email"
                disabled={!canManage}
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
            </label>
            <Button type="button" variant="outline" disabled={!canManage || !testEmail || testing !== null} onClick={() => void sendTest('email')}>
              {testing === 'email' ? 'Sending…' : 'Send test email'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>SMS OTP</CardTitle>
            <Badge variant={settings.smsOtpEnabled ? 'default' : 'secondary'}>
              {settings.smsOtpEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Low-cost India OTP via{' '}
            <a className="underline" href="https://msg91.com" target="_blank" rel="noreferrer">
              MSG91
            </a>
            . Twilio is optional for other countries.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.smsOtpEnabled}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, smsOtpEnabled: event.target.checked })}
            />
            Enable SMS one-time codes
          </label>
          <label className="text-sm md:col-span-2">
            Provider
            <select
              className={fieldClass}
              value={settings.smsProvider}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, smsProvider: event.target.value as SmsOtpProvider })}
            >
              {SMS_PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {settings.smsProvider === 'MSG91' ? (
            <>
              <label className="text-sm">
                MSG91 auth key {settings.hasSmsApiKey ? '(saved)' : ''}
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="off"
                  disabled={!canManage}
                  placeholder={settings.hasSmsApiKey ? 'Leave blank to keep' : ''}
                  value={smsApiKey}
                  onChange={(event) => setSmsApiKey(event.target.value)}
                />
              </label>
              <label className="text-sm">
                Sender ID
                <input
                  className={fieldClass}
                  disabled={!canManage}
                  value={settings.smsSenderId ?? ''}
                  onChange={(event) => setSettings({ ...settings, smsSenderId: event.target.value || null })}
                />
              </label>
            </>
          ) : null}
          {settings.smsProvider === 'TWILIO' ? (
            <>
              <label className="text-sm">
                Account SID
                <input
                  className={fieldClass}
                  disabled={!canManage}
                  value={settings.twilioAccountSid ?? ''}
                  onChange={(event) => setSettings({ ...settings, twilioAccountSid: event.target.value || null })}
                />
              </label>
              <label className="text-sm">
                Auth token {settings.hasTwilioAuthToken ? '(saved)' : ''}
                <input
                  className={fieldClass}
                  type="password"
                  autoComplete="off"
                  disabled={!canManage}
                  placeholder={settings.hasTwilioAuthToken ? 'Leave blank to keep' : ''}
                  value={twilioAuthToken}
                  onChange={(event) => setTwilioAuthToken(event.target.value)}
                />
              </label>
              <label className="text-sm">
                From number
                <input
                  className={fieldClass}
                  disabled={!canManage}
                  value={settings.smsFromNumber ?? ''}
                  onChange={(event) => setSettings({ ...settings, smsFromNumber: event.target.value || null })}
                />
              </label>
            </>
          ) : null}
          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <label className="min-w-[16rem] flex-1 text-sm">
              Send test SMS to
              <input
                className={fieldClass}
                disabled={!canManage}
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
              />
            </label>
            <Button type="button" variant="outline" disabled={!canManage || !testPhone || testing !== null} onClick={() => void sendTest('sms')}>
              {testing === 'sms' ? 'Sending…' : 'Send test SMS'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Google Sign-In</CardTitle>
            <Badge variant={settings.googleSignInEnabled ? 'default' : 'secondary'}>
              {settings.googleSignInEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Create a Web OAuth client in{' '}
            <a className="underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
              Google Cloud Console
            </a>
            . Authorized redirect URI must be <code>/api/v1/store/auth/google/callback</code> on this API host.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.googleSignInEnabled}
              disabled={!canManage}
              onChange={(event) => setSettings({ ...settings, googleSignInEnabled: event.target.checked })}
            />
            Enable Continue with Google
          </label>
          <label className="text-sm md:col-span-2">
            Client ID
            <input
              className={fieldClass}
              disabled={!canManage}
              value={settings.googleClientId ?? ''}
              onChange={(event) => setSettings({ ...settings, googleClientId: event.target.value || null })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            Client secret {settings.hasGoogleClientSecret ? '(saved)' : ''}
            <input
              className={fieldClass}
              type="password"
              autoComplete="off"
              disabled={!canManage}
              placeholder={settings.hasGoogleClientSecret ? 'Leave blank to keep' : ''}
              value={googleClientSecret}
              onChange={(event) => setGoogleClientSecret(event.target.value)}
            />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!canManage || saving}>
            {saving ? 'Saving…' : 'Save authentication'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
