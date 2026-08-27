'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@jersey-commerce/ui';
import { Button, PasswordInput } from '@jersey-commerce/ui';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { useStore } from '../providers/store-provider';
import { publicErrorMessage } from '../../lib/errors';

type LoginMethod = 'password' | 'email' | 'sms';

function maskIdentifier(value: string, channel: 'email' | 'sms'): string {
  if (channel === 'sms') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4) {
      return value;
    }
    return `${digits.slice(0, 2)}••••${digits.slice(-2)}`;
  }
  const [local, domain] = value.split('@');
  if (!domain) {
    return value;
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > 2 ? '•••' : ''}@${domain}`;
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) {
    return `${remainder}s`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function AuthShell({
  shopName,
  title,
  subtitle,
  children,
  footer,
}: {
  shopName: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="border border-foreground/10 bg-background/90 px-6 py-8 shadow-[0_24px_80px_-48px_hsl(var(--foreground)/0.35)] sm:px-8 sm:py-10">
        <div className="space-y-2 border-b border-foreground/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{shopName}</p>
          <h1 className="font-heading text-[clamp(2rem,6vw,2.75rem)] uppercase leading-none tracking-wide">{title}</h1>
          {subtitle ? <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="space-y-5 pt-6">{children}</div>
        {footer ? <div className="mt-6 border-t border-foreground/10 pt-6 text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}

function AuthDivider({ label = 'or' }: { label?: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden="true">
      <span className="editorial-rule flex-1" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="editorial-rule flex-1" />
    </div>
  );
}

function GoogleMark(): React.JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.42ZM12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A9.99 9.99 0 0 0 12 22ZM6.4 13.91A6.01 6.01 0 0 1 6.08 12c0-.66.11-1.31.3-1.91V7.51H3.06A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.34-2.58ZM12 5.98c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 2.99 14.7 2 12 2 8.09 2 4.7 4.24 3.06 7.51l3.32 2.58C7.19 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

function GoogleButton({ pending }: { pending: boolean }): React.JSX.Element | null {
  const { startGoogle } = useAuth();
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  if (!store.auth?.googleSignIn) {
    return null;
  }
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        type="button"
        variant="outline"
        className="store-pill h-11 w-full rounded-none border-foreground/25 bg-transparent text-foreground hover:border-foreground hover:bg-foreground hover:text-background"
        disabled={pending}
        data-cursor="hover"
        onClick={() => {
          void (async () => {
            try {
              await startGoogle();
            } catch (caught) {
              setError(publicErrorMessage(caught, 'Could not start Google Sign-In.'));
            }
          })();
        }}
      >
        <GoogleMark />
        Continue with Google
      </Button>
    </div>
  );
}

function AuthMethodTabs({
  methods,
  active,
  onChange,
}: {
  methods: { id: LoginMethod; label: string }[];
  active: LoginMethod;
  onChange: (method: LoginMethod) => void;
}): React.JSX.Element | null {
  if (methods.length <= 1) {
    return null;
  }
  return (
    <div className="grid border border-foreground/15" style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }}>
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          className={cn(
            'min-h-11 px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:text-[11px]',
            active === method.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
          )}
          aria-pressed={active === method.id}
          onClick={() => onChange(method.id)}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}

function OtpForm({ channel }: { channel: 'email' | 'sms' }): React.JSX.Element {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await requestOtp({
        channel,
        email: channel === 'email' ? identifier : undefined,
        phone: channel === 'sms' ? identifier : undefined,
      });
      setExpiresIn(result.expiresIn);
      setResendIn(result.expiresIn);
      setCode('');
      setStep('verify');
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not send the code.'));
    } finally {
      setPending(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await verifyOtp({
        channel,
        email: channel === 'email' ? identifier : undefined,
        phone: channel === 'sms' ? identifier : undefined,
        code,
        name: name || undefined,
      });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not verify this code.'));
    } finally {
      setPending(false);
    }
  }

  if (step === 'verify') {
    const expiryMinutes = Math.max(1, Math.round(expiresIn / 60));
    return (
      <form onSubmit={(event) => void confirm(event)} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="rounded-none border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="font-medium text-foreground">{maskIdentifier(identifier, channel)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Expires in about {expiryMinutes} minute{expiryMinutes === 1 ? '' : 's'}.</p>
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Name (optional)</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="For new accounts" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">6-digit code</span>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="h-12 text-center text-lg tracking-[0.35em]"
            maxLength={6}
            required
          />
        </label>
        <Button type="submit" className="store-cta h-11 w-full rounded-none" disabled={pending || code.length !== 6}>
          {pending ? 'Verifying…' : 'Verify and sign in'}
        </Button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {resendIn > 0 ? (
            <span className="text-muted-foreground">Resend in {formatCountdown(resendIn)}</span>
          ) : (
            <button type="button" className="underline underline-offset-4" disabled={pending} onClick={() => void sendCode()}>
              Resend code
            </button>
          )}
          <button type="button" className="underline underline-offset-4" onClick={() => setStep('request')}>
            Change {channel === 'email' ? 'email' : 'number'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void sendCode(event)} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <p className="text-sm text-muted-foreground">
        {channel === 'email'
          ? 'We will email you a one-time code. No password needed.'
          : 'We will text you a one-time code. No password needed.'}
      </p>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {channel === 'email' ? 'Email' : 'Phone'}
        </span>
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          type={channel === 'email' ? 'email' : 'tel'}
          autoComplete={channel === 'email' ? 'email' : 'tel'}
          required
        />
      </label>
      <Button type="submit" className="store-cta h-11 w-full rounded-none" disabled={pending}>
        {pending ? 'Sending…' : 'Send sign-in code'}
      </Button>
    </form>
  );
}

function PasswordLoginForm({
  error,
  pending,
  onSubmit,
}: {
  error: string | null;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): React.JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</span>
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Password</span>
        <PasswordInput name="password" autoComplete="current-password" className="h-11 rounded-none md:text-sm" required />
      </label>
      <Button type="submit" className="store-cta h-11 w-full rounded-none" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const methods = store.auth ?? { passwordLogin: true, emailOtp: false, smsOtp: false, googleSignIn: false };
  const shopName = store.tenant.name.trim() || 'Jerzyfy';

  const loginMethods = useMemo(
    () =>
      [
        methods.passwordLogin ? { id: 'password' as const, label: 'Password' } : null,
        methods.emailOtp ? { id: 'email' as const, label: 'Email code' } : null,
        methods.smsOtp ? { id: 'sms' as const, label: 'SMS code' } : null,
      ].filter(Boolean) as { id: LoginMethod; label: string }[],
    [methods.emailOtp, methods.passwordLogin, methods.smsOtp],
  );

  const [activeMethod, setActiveMethod] = useState<LoginMethod>(() => loginMethods[0]?.id ?? 'password');

  useEffect(() => {
    if (!loginMethods.some((method) => method.id === activeMethod)) {
      setActiveMethod(loginMethods[0]?.id ?? 'password');
    }
  }, [activeMethod, loginMethods]);

  const hasCredentialMethods = loginMethods.length > 0;
  const hasGoogle = methods.googleSignIn;

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not sign in.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      shopName={shopName}
      title="Sign in"
      subtitle="Welcome back. Pick the sign-in option that works for you."
      footer={
        methods.passwordLogin ? (
          <>
            New here?{' '}
            <Link href="/auth/register" className="font-medium text-foreground underline underline-offset-4">
              Create an account
            </Link>
          </>
        ) : (
          'A new account is created automatically the first time you verify a code or use Google.'
        )
      }
    >
      {hasGoogle ? <GoogleButton pending={pending} /> : null}
      {hasGoogle && hasCredentialMethods ? <AuthDivider /> : null}

      {hasCredentialMethods ? (
        <>
          <AuthMethodTabs methods={loginMethods} active={activeMethod} onChange={setActiveMethod} />
          {activeMethod === 'password' ? (
            <PasswordLoginForm error={error} pending={pending} onSubmit={(event) => void onPasswordSubmit(event)} />
          ) : null}
          {activeMethod === 'email' ? <OtpForm channel="email" /> : null}
          {activeMethod === 'sms' ? <OtpForm channel="sms" /> : null}
        </>
      ) : null}

      {!hasCredentialMethods && !hasGoogle ? (
        <Alert tone="danger">This store has no customer sign-in methods enabled.</Alert>
      ) : null}
    </AuthShell>
  );
}

export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const shopName = store.tenant.name.trim() || 'Jerzyfy';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await register({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? '') || undefined,
        password: String(form.get('password') ?? ''),
      });
      router.push('/account');
      router.refresh();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not create this account.'));
    } finally {
      setPending(false);
    }
  }

  if (!store.auth?.passwordLogin) {
    return (
      <AuthShell
        shopName={shopName}
        title="Create account"
        subtitle="Password registration is off for this store."
        footer={
          <>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </>
        }
      >
        <GoogleButton pending={pending} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      shopName={shopName}
      title="Create account"
      subtitle="Join the squad — checkout faster and track orders."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Name</span>
          <Input name="name" autoComplete="name" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email</span>
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Phone (optional)</span>
          <Input name="phone" autoComplete="tel" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Password</span>
          <Input name="password" type="password" autoComplete="new-password" required />
        </label>
        <Button type="submit" className="store-cta h-11 w-full rounded-none" disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </Button>
      </form>
      {store.auth?.googleSignIn ? (
        <>
          <AuthDivider />
          <GoogleButton pending={pending} />
        </>
      ) : null}
    </AuthShell>
  );
}
