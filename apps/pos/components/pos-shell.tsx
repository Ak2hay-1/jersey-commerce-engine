'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Badge, Button, cn } from '@jersey-commerce/ui';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { usePosSession } from '@/lib/session';

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

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace('/login');
    }
  }, [auth.loading, auth.user, router]);

  useEffect(() => {
    if (auth.loading || !auth.user || !auth.can('pos.access')) {
      return;
    }
    void refresh();
  }, [auth, refresh]);

  useEffect(() => {
    if (auth.loading || sessionLoading || !auth.user || !auth.can('pos.access')) {
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
      <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Loading register…
      </div>
    );
  }

  if (!auth.can('pos.access')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="max-w-md space-y-3 text-center">
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
      <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{auth.tenant.name}</p>
            <p className="truncate text-xs text-muted-foreground">{auth.user.name}</p>
          </div>
          <Badge variant={session ? 'default' : 'secondary'}>{session ? 'Session open' : 'No session'}</Badge>
          {session ? (
            <p className="text-sm text-muted-foreground">
              Expected cash <span className="font-medium text-foreground">{formatMoney(session.expectedCash)}</span>
            </p>
          ) : null}
          <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="POS">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  navActive(pathname, item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/session/close">Close register</Link>
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => void auth.logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
