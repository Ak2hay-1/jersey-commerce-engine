'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import type { LoginTenantOption } from '@jersey-commerce/types';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { useAuth } from '@/lib/auth';
import { listLoginTenants } from '@/lib/api';
import { getDefaultTenantSlug } from '@/lib/env';

const SHOP_BRAND = 'Jerzyfy';
const DEFAULT_SHOP: LoginTenantOption = {
  name: SHOP_BRAND,
  slug: getDefaultTenantSlug() || 'demo-jersey-store',
};

function shopDisplayName(shop: LoginTenantOption, onlyShop: boolean): string {
  if (onlyShop) {
    return SHOP_BRAND;
  }
  const name = shop.name.trim();
  if (!name || name === shop.slug || shop.slug === 'demo-jersey-store' || name === 'Demo Jersey Store') {
    return SHOP_BRAND;
  }
  return name;
}

function resolveShops(items: LoginTenantOption[] | undefined): LoginTenantOption[] {
  const list = (items ?? []).filter((shop) => shop.slug);
  const source = list.length > 0 ? list : [DEFAULT_SHOP];
  return source.map((shop) => ({
    slug: shop.slug,
    name: shopDisplayName(shop, source.length === 1),
  }));
}

export default function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shops, setShops] = useState<LoginTenantOption[]>([DEFAULT_SHOP]);
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_SHOP.slug);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      router.replace(auth.user.mustChangePassword ? '/change-password' : '/');
    }
  }, [auth.loading, auth.user, router]);

  useEffect(() => {
    let cancelled = false;
    void listLoginTenants()
      .then((result) => {
        if (cancelled) {
          return;
        }
        const items = resolveShops(result.items);
        setShops(items);
        setTenantSlug((current) => (items.some((shop) => shop.slug === current) ? current : items[0]?.slug ?? DEFAULT_SHOP.slug));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        const items = resolveShops(undefined);
        setShops(items);
        setTenantSlug(items[0]?.slug ?? DEFAULT_SHOP.slug);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await auth.login({ email, password, tenantSlug: tenantSlug || undefined });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pos-login-stage flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-white">
      <DesktopModeSwitch active="pos" />
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white/95 text-foreground shadow-2xl shadow-black/30">
        <Card className="border-0 shadow-none">
          <CardHeader className="space-y-2 pb-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground">
                JF
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{SHOP_BRAND}</p>
                <CardTitle className="mt-0.5 text-2xl">Point of sale</CardTitle>
              </div>
            </div>
            <CardDescription>Sign in with a staff email that has register access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="staff@example.com"
                  className="mt-1 h-11 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 h-11 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="shop">Shop</Label>
                <select
                  id="shop"
                  className="mt-1 flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={tenantSlug}
                  onChange={(event) => setTenantSlug(event.target.value)}
                >
                  {shops.length !== 1 ? <option value="">Select a shop</option> : null}
                  {shops.map((shop) => (
                    <option key={shop.slug} value={shop.slug}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="pos-pay-button h-11 w-full rounded-xl" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Open register'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
