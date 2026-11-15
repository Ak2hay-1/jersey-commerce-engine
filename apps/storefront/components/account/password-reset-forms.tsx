'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@jersey-commerce/ui';
import { storeApi } from '../../lib/api';
import { publicErrorMessage } from '../../lib/errors';
import { useStore } from '../providers/store-provider';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';

function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  const store = useStore();
  const shopName = store.tenant.name.trim() || 'Jerzyfy';
  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{shopName}</p>
      <h1 className="mt-3 font-heading text-3xl uppercase tracking-wide">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8 space-y-4">{children}</div>
      {footer ? <p className="mt-6 text-sm text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

export function ForgotPasswordForm(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await storeApi.forgotPassword({ email });
      setNotice(result.message);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not send a reset email.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter the email on your account. If it matches, we will send a reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        <label className="grid gap-1.5 text-sm">
          <span className="text-micro text-muted-foreground">Email</span>
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <button type="submit" className="btn btn-lg btn-primary w-full cursor-pointer" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [error, setError] = useState<string | null>(token ? null : 'This reset link is missing or incomplete.');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('This reset link is missing or incomplete.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await storeApi.resetPassword({ token, password });
      router.push('/auth/login');
      router.refresh();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not reset your password.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          Back to{' '}
          <Link href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
            sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <label className="grid gap-1.5 text-sm">
          <span className="text-micro text-muted-foreground">New password</span>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            className="h-12 rounded-[var(--radius)] border-[hsl(var(--input))] bg-[hsl(var(--surface-1))] md:text-sm"
            required
            minLength={8}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-micro text-muted-foreground">Confirm password</span>
          <PasswordInput
            name="confirm"
            autoComplete="new-password"
            className="h-12 rounded-[var(--radius)] border-[hsl(var(--input))] bg-[hsl(var(--surface-1))] md:text-sm"
            required
            minLength={8}
          />
        </label>
        <button type="submit" className="btn btn-lg btn-primary w-full cursor-pointer" disabled={pending || !token}>
          {pending ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  );
}
