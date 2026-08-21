'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Badge, Button, cn } from '@jersey-commerce/ui';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { usePosSession } from '@/lib/session';
import { useRealtime } from '@/lib/realtime';

const NAV = [
  { href: '/register', label: 'Register' },
  { href: '/held', label: 'Held' },
  { href: '/sales', label: 'Sales' },
];

function navActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PosShell({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { loading: sessionLoading, session, refresh } = usePosSession();
  const realtime = useRealtime();

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
    if (auth.loading || !auth.user || auth.user.mustChangePassword || !auth.can('pos.access')) {
      return;
    }
    void refresh();
  }, [auth, refresh]);

  useEffect(() => {
    if (auth.loading || sessionLoading || !auth.user || auth.user.mustChangePassword || !auth.can('pos.access')) {
      return;
    }
    if (!session && pathname !== '/session/open') {
      router.replace('/session/open');
    }
    if (session && pathname === '/session/open') {
      router.replace('/register');
    }
  }, [auth, pathname, router, session, sessionLoading]);

  if (auth.loading || !auth.user || !auth.tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading register…
      </div>
    );
  }

  if (auth.user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Opening password change…
      </div>
    );
  }

  if (!auth.can('pos.access')) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">No POS access</h1>
          <p className="text-sm text-muted-foreground">
            {auth.user.name} does not have permission to use the point of sale. Sign in with a cashier, manager, or
            owner account.
          </p>
          <Button type="button" variant="outline" onClick={() => void auth.logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (sessionLoading && pathname !== '/session/open') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="pos-shell-header sticky top-0 z-30 border-b">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                JF
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">{auth.tenant.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  POS · {auth.user.name}
                </p>
              </div>
            </div>
          </div>
          <DesktopModeSwitch active="pos" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={session ? 'default' : 'secondary'}
              className={cn(session && 'bg-emerald-700 hover:bg-emerald-700')}
            >
              {session ? 'Session open' : 'No session'}
            </Badge>
            <Badge variant={realtime.connected ? 'secondary' : 'outline'}>
              {realtime.connected ? 'Live' : 'Offline'}
            </Badge>
            {session ? (
              <p className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
                Expected cash{' '}
                <span className="font-semibold text-foreground">{formatMoney(session.expectedCash)}</span>
              </p>
            ) : null}
          </div>
          <nav className="flex flex-1 flex-wrap items-center justify-center gap-1 lg:justify-start" aria-label="POS">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={navActive(pathname, item.href)}
                className="pos-nav-pill"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {session ? (
              <Button type="button" variant="outline" size="sm" className="h-10 rounded-full" asChild>
                <Link href="/session/close">Close register</Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="h-10 rounded-full" onClick={() => void auth.logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
