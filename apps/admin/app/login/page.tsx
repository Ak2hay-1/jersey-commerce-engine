'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import { useAuth } from '@/lib/auth';

export default function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('owner@demo.local');
  const [password, setPassword] = useState('DevPassword123!');
  const [tenantSlug, setTenantSlug] = useState('demo-jersey-store');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await auth.login({ email, password, tenantSlug: tenantSlug || undefined });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Jersey Commerce ERP. Use your staff email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="slug">Tenant slug</Label>
              <Input id="slug" className="mt-1" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
