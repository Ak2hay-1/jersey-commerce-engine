'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';
import { useAuth } from '../providers/auth-provider';
import { publicErrorMessage } from '../../lib/errors';

export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4">
      <h1 className="font-heading text-4xl uppercase tracking-wide">Sign in</h1>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <label className="grid gap-1 text-sm">
        Email
        <Input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="grid gap-1 text-sm">
        Password
        <Input name="password" type="password" autoComplete="current-password" required />
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-sm text-muted-foreground">
        New here? <Link href="/auth/register" className="underline">Create an account</Link>
      </p>
    </form>
  );
}

export function RegisterForm(): React.JSX.Element {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4">
      <h1 className="font-heading text-4xl uppercase tracking-wide">Create account</h1>
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
