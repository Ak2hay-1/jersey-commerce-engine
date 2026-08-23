'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, PasswordInput } from '@jersey-commerce/ui';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { useStore } from '../providers/store-provider';
import { publicErrorMessage } from '../../lib/errors';

function GoogleButton({ pending }: { pending: boolean }): React.JSX.Element | null {
  const { startGoogle } = useAuth();
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  if (!store.auth?.googleSignIn) {
    return null;
  }
  return (
    <div className="space-y-2">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
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
        Continue with Google
      </Button>
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await requestOtp({
        channel,
        email: channel === 'email' ? identifier : undefined,
        phone: channel === 'sms' ? identifier : undefined,
      });
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
    return (
      <form onSubmit={(event) => void confirm(event)} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {identifier}.</p>
        <label className="grid gap-1 text-sm">
          Name (optional, for new accounts)
          <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
        </label>
        <label className="grid gap-1 text-sm">
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Verifying…' : 'Verify code'}
        </Button>
        <button type="button" className="text-sm underline" onClick={() => setStep('request')}>
          Use a different {channel === 'email' ? 'email' : 'number'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void sendCode(event)} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <label className="grid gap-1 text-sm">
        {channel === 'email' ? 'Email' : 'Phone'}
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          type={channel === 'email' ? 'email' : 'tel'}
          autoComplete={channel === 'email' ? 'email' : 'tel'}
          required
        />
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send code'}
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
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
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{shopName}</p>
        <h1 className="font-heading text-3xl uppercase tracking-wide md:text-4xl">Sign in</h1>
      </div>
      <GoogleButton pending={pending} />
      {methods.emailOtp ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Email code</h2>
          <OtpForm channel="email" />
        </section>
      ) : null}
      {methods.smsOtp ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">SMS code</h2>
          <OtpForm channel="sms" />
        </section>
      ) : null}
      {methods.passwordLogin ? (
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          {methods.emailOtp || methods.smsOtp || methods.googleSignIn ? (
            <h2 className="text-sm font-medium">Password</h2>
          ) : null}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <label className="grid gap-1 text-sm">
            Email
            <Input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <PasswordInput name="password" autoComplete="current-password" className="h-11 md:text-sm" required />
          </label>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      ) : null}
      {!methods.passwordLogin && !methods.emailOtp && !methods.smsOtp && !methods.googleSignIn ? (
        <Alert tone="danger">This store has no customer sign-in methods enabled.</Alert>
      ) : null}
      {methods.passwordLogin ? (
        <p className="text-sm text-muted-foreground">
          New here? <Link href="/auth/register" className="underline">Create an account</Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">A new account is created automatically the first time you verify a code or Google sign-in.</p>
      )}
    </div>
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
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{shopName}</p>
          <h1 className="font-heading text-3xl uppercase tracking-wide md:text-4xl">Create account</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Password registration is off. <Link href="/auth/login" className="underline">Sign in</Link> with a code or Google instead.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{shopName}</p>
        <h1 className="font-heading text-3xl uppercase tracking-wide md:text-4xl">Create account</h1>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <label className="grid gap-1 text-sm">
        Name
        <Input name="name" autoComplete="name" required />
      </label>
      <label className="grid gap-1 text-sm">
        Email
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="grid gap-1 text-sm">
        Phone (optional)
        <Input name="phone" autoComplete="tel" />
      </label>
      <label className="grid gap-1 text-sm">
        Password
        <Input name="password" type="password" autoComplete="new-password" required />
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Creating…' : 'Create account'}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account? <Link href="/auth/login" className="underline">Sign in</Link>
      </p>
    </form>
  );
}
