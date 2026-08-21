'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge, Button, cn } from '@jersey-commerce/ui';
import { ERP_NAV, filterErpNav } from '@jersey-commerce/types';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { getStaffPortal } from '@/lib/env';

function navActive(pathname: string, href: string): boolean {
  const path = href.split('?')[0] ?? href;
  if (path === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function ErpShell({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const realtime = useRealtime();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace('/login');
      return;
    }
    if (!auth.loading && auth.user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [auth.loading, auth.user, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const portal = getStaffPortal();
  const sections = useMemo(() => filterErpNav(auth.permissions, portal), [auth.permissions, portal]);
  const portalLabel = portal === 'admin' ? 'Admin Panel' : portal === 'erp' ? 'ERP' : 'Admin & ERP';

  if (auth.loading || !auth.user || !auth.tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (auth.user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Opening password change…
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{portalLabel}</p>
        <p className="mt-1 truncate text-sm font-semibold">{auth.tenant.name}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label={portalLabel}>
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = navActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block rounded-md px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-background shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="hidden min-h-screen border-r bg-background lg:block">{sidebar}</aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
            <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
              Menu
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{auth.tenant.name}</p>
              <p className="truncate text-xs text-muted-foreground">{auth.tenant.slug}</p>
            </div>
            <DesktopModeSwitch active="erp" />
            <div className="hidden items-center gap-2 sm:flex" aria-label="Notifications">
              <Badge variant={realtime.connected ? 'secondary' : 'outline'}>
                {realtime.connected ? 'Live' : 'Offline'}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{auth.user.name}</p>
              <p className="text-xs text-muted-foreground">{auth.user.roles.join(', ')}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void auth.logout()}>
              Sign out
            </Button>
          </header>
          <main id="main" className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export { ERP_NAV };
