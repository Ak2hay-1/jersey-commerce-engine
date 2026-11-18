'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, LogOut, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { Button, cn } from '@jersey-commerce/ui';
import { ERP_NAV, filterErpNav } from '@jersey-commerce/types';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { CircleHelp, navIconFor } from '@/components/erp-nav-icons';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { useTheme } from '@/lib/theme';
import { getStaffPortal } from '@/lib/env';

function navActive(pathname: string, href: string): boolean {
  const path = href.split('?')[0] ?? href;
  if (path === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function firstName(fullName: string | undefined): string {
  const part = fullName?.trim().split(/\s+/)[0];
  return part || 'there';
}

export function ErpShell({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const realtime = useRealtime();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);

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
    setAlertsOpen(false);
  }, [pathname]);

  const portal = getStaffPortal();
  const sections = useMemo(() => filterErpNav(auth.permissions, portal), [auth.permissions, portal]);
  const brand = auth.tenant?.name?.trim() || 'Jerzyfy';
  const offline = realtime.status !== 'live';

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [query, sections]);

  if (auth.loading || !auth.user || !auth.tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--erp-canvas))] text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (auth.user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--erp-canvas))] text-sm text-muted-foreground">
        Opening password change…
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-5 flex items-center gap-2.5 px-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background"
          aria-hidden
        >
          J
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">{brand}</p>
          <p className="truncate text-[11px] text-muted-foreground">Staff portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto pb-4" aria-label="Staff navigation">
        {filteredSections.map((section) => (
          <div key={section.id}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = navActive(pathname, item.href);
                const Icon = navIconFor(item.href);
                const className = cn('erp-nav-pill cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring');
                const body = (
                  <>
                    <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </>
                );
                return (
                  <li key={`${item.href}-${item.label}`}>
                    {item.external ? (
                      <a href={item.href} className={className} data-active={active}>
                        {body}
                      </a>
                    ) : (
                      <Link href={item.href} className={className} data-active={active}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {filteredSections.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">No matching pages.</p>
        ) : null}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/60 pt-3">
        <Link href="/settings" className="erp-nav-pill cursor-pointer" data-active={pathname.startsWith('/settings')}>
          <CircleHelp className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>Help & settings</span>
        </Link>
        <button
          type="button"
          className="erp-nav-pill w-full cursor-pointer text-left"
          onClick={() => void auth.logout()}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--erp-canvas))] p-3 sm:p-4 lg:p-5">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[18rem] bg-[hsl(var(--erp-shell))] shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="flex justify-end p-3">
              <Button type="button" size="icon" variant="ghost" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="erp-shell-frame mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] overflow-hidden lg:grid-cols-[16.5rem_1fr]">
        <aside className="hidden border-r border-border/50 bg-[hsl(var(--erp-shell))] lg:block">{sidebar}</aside>

        <div className="flex min-w-0 flex-col bg-[hsl(var(--erp-canvas)/0.35)]">
          <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" size="icon" className="rounded-full lg:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                Welcome, {firstName(auth.user.name)}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Here&apos;s what&apos;s happening in your store.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DesktopModeSwitch active="erp" showPos={auth.can('pos.access')} />
              <div className="erp-top-pill">
                <label className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search pages"
                    aria-label="Search pages"
                    className="h-9 w-36 rounded-full border-0 bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground sm:w-48"
                  />
                </label>
                <button
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-background/80"
                  aria-label={theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  onClick={theme.toggle}
                >
                  {theme.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-background/80"
                    aria-label="Notifications"
                    aria-expanded={alertsOpen}
                    onClick={() => setAlertsOpen((value) => !value)}
                  >
                    <Bell className="h-4 w-4" />
                    {offline ? (
                      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                    ) : null}
                  </button>
                  {alertsOpen ? (
                    <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border bg-popover p-3 text-sm shadow-lg">
                      <p className="font-medium">Alerts</p>
                      <p className="mt-1 text-muted-foreground">
                        Connection: {realtime.status === 'live' ? 'Live' : realtime.status === 'connecting' ? 'Connecting' : 'Offline'}
                      </p>
                      {auth.can('inventory.read') ? (
                        <Link
                          href="/inventory/low-stock"
                          className="mt-3 block cursor-pointer rounded-xl bg-muted px-3 py-2 text-foreground hover:bg-muted/80"
                          onClick={() => setAlertsOpen(false)}
                        >
                          Review low stock
                        </Link>
                      ) : (
                        <p className="mt-2 text-muted-foreground">No inventory alerts available for your role.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main id="main" className="erp-main flex-1 px-4 pb-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export { ERP_NAV };
