'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import { useAuth } from '@/lib/auth';
import { changePassword } from '@/lib/api';

export default function ChangePasswordPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace('/login');
    }
  }, [auth.loading, auth.user, router]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await changePassword({ currentPassword, newPassword });
      await auth.logout();
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            {auth.user?.mustChangePassword
              ? 'This is a temporary password. Set a new one before you can use the register.'
              : 'Choose a new password, then sign in again.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                autoComplete="current-password"
                className="mt-1 h-11"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="next">New password</Label>
              <Input
                id="next"
                type="password"
                autoComplete="new-password"
                className="mt-1 h-11"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                8–128 characters with uppercase, lowercase, a number, and a special character.
              </p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                className="mt-1 h-11"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="h-11 w-full" disabled={submitting || auth.loading || !auth.user}>
              {submitting ? 'Saving…' : 'Save password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
