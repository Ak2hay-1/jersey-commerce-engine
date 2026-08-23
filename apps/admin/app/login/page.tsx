'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PasswordInput } from '@jersey-commerce/ui';
import type { LoginTenantOption } from '@jersey-commerce/types';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { useAuth } from '@/lib/auth';
import { listLoginTenants } from '@/lib/api';
import { getDefaultTenantSlug, getStaffPortal, type StaffPortal } from '@/lib/env';

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

function portalCopy(portal: StaffPortal): { title: string; description: string } {
  if (portal === 'admin') {
    return {
      title: 'Admin Panel',
      description: 'Sign in to manage the website, users, and promo codes.',
    };
  }
  if (portal === 'erp') {
    return {
      title: 'ERP',
      description: 'Sign in to manage sales, stock, purchasing, and reports.',
    };
  }
  return {
    title: 'Admin & ERP',
    description: 'Sign in with your staff email and password.',
  };
}

export default function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const portal = getStaffPortal();
  const { title, description } = portalCopy(portal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shops, setShops] = useState<LoginTenantOption[]>([DEFAULT_SHOP]);
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_SHOP.slug);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-6">
      <DesktopModeSwitch active="erp" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{SHOP_BRAND}</p>
          <CardTitle className="mt-1">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" placeholder="owner@example.com" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="current-password" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="shop">Shop</Label>
              <select
                id="shop"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
