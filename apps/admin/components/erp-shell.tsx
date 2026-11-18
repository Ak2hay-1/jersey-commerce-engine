'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, ShoppingBag, Sun, X } from 'lucide-react';
import { Button, cn } from '@jersey-commerce/ui';
import {
  ERP_NAV,
  STAFF_WORKSPACE_STORAGE_KEY,
  filterErpNav,
  filterErpNavSearchExtra,
  resolveStaffWorkspace,
  workspaceAccess,
  workspaceHomePath,
  type ErpNavItem,
  type ErpNavSection,
  type StaffWorkspace,
} from '@jersey-commerce/types';
import { DesktopModeSwitch } from '@/components/desktop-mode-switch';
import { WorkspaceSwitch } from '@/components/workspace-switch';
import { navIconFor } from '@/components/erp-nav-icons';
import { useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { useTheme } from '@/lib/theme';
import { getStaffPortal } from '@/lib/env';

function hrefPath(href: string): string {
  return href.split('?')[0] ?? href;
}

function hrefQuery(href: string): string {
  return href.includes('?') ? (href.split('?')[1] ?? '') : '';
}

function queriesMatch(href: string, search: string): boolean {
  const required = hrefQuery(href);
  if (!required) {
    return true;
  }
  const want = new URLSearchParams(required);
  const have = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) {
      return false;
    }
  }
  return true;
}

function pathMatches(pathname: string, path: string): boolean {
  if (path === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function navActive(pathname: string, search: string, href: string, siblings: readonly string[] = []): boolean {
  const path = hrefPath(href);
  if (!pathMatches(pathname, path) || !queriesMatch(href, search)) {
    return false;
  }
  const hasQuery = Boolean(hrefQuery(href));
  if (hasQuery) {
    return true;
  }
  const moreSpecific = siblings.some((other) => {
    if (other === href) {
      return false;
    }
    const otherPath = hrefPath(other);
    if (otherPath === path || !otherPath.startsWith(`${path}/`)) {
      return false;
    }
    return pathMatches(pathname, otherPath) && queriesMatch(other, search);
  });
  return !moreSpecific;
}

function sectionContainsPath(section: ErpNavSection, pathname: string, search: string): boolean {
  const hrefs = section.items.map((item) => item.href);
  return section.items.some((item) => navActive(pathname, search, item.href, hrefs));
}

function firstName(fullName: string | undefined): string {
  const part = fullName?.trim().split(/\s+/)[0];
  return part || 'there';
}

function readStoredWorkspace(): StaffWorkspace | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(STAFF_WORKSPACE_STORAGE_KEY);
    return value === 'erp' || value === 'admin' ? value : null;
  } catch {
    return null;
  }
}

function persistWorkspace(workspace: StaffWorkspace): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STAFF_WORKSPACE_STORAGE_KEY, workspace);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function NavLink({
  item,
  active,
  className,
}: {
  item: ErpNavItem;
  active: boolean;
  className?: string;
}): React.JSX.Element {
  const Icon = navIconFor(item.href);
  const classes = cn(
    'erp-nav-pill cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    className,
  );
  const body = (
    <>
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{item.label}</span>
    </>
  );
  if (item.external) {
    return (
      <a href={item.href} className={classes} data-active={active}>
        {body}
      </a>
    );
  }
  return (
    <Link href={item.href} className={classes} data-active={active}>
      {body}
    </Link>
  );
}

function ErpShellInner({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const realtime = useRealtime();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<StaffWorkspace>('erp');
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const envPortal = getStaffPortal();
  const access = useMemo(() => workspaceAccess(auth.permissions), [auth.permissions]);

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
  }, [pathname, search]);

  useEffect(() => {
    if (auth.loading) {
      return;
    }
    const next = resolveStaffWorkspace({
      envPortal,
      pathname,
      permissions: auth.permissions,
      stored: readStoredWorkspace(),
    });
    setWorkspace(next);
    persistWorkspace(next);
    setWorkspaceReady(true);
  }, [auth.loading, auth.permissions, envPortal, pathname]);

  const navPortal = envPortal === 'all' ? workspace : envPortal;
  const sections = useMemo(() => filterErpNav(auth.permissions, navPortal), [auth.permissions, navPortal]);
  const searchExtra = useMemo(
    () => filterErpNavSearchExtra(auth.permissions, navPortal),
    [auth.permissions, navPortal],
  );
  const brand = auth.tenant?.name?.trim() || 'Jerzyfy';
  const offline = realtime.status !== 'live';
  const showWorkspaceSwitch =
    envPortal === 'all' && access.erp && access.admin;

  const registerItem = useMemo(
    () => sections.find((section) => section.id === 'register')?.items[0] ?? null,
    [sections],
  );
  const accountSection = useMemo(
    () => sections.find((section) => section.id === 'account') ?? null,
    [sections],
  );
  const websiteSection = useMemo(
    () => sections.find((section) => section.id === 'website') ?? null,
    [sections],
  );
  const mainSections = useMemo(
    () =>
      sections.filter(
        (section) => section.id !== 'register' && section.id !== 'account' && section.id !== 'website',
      ),
    [sections],
  );

  useEffect(() => {
    const active = mainSections.find((section) => sectionContainsPath(section, pathname, search));
    setExpandedId(active?.id ?? null);
  }, [mainSections, pathname, search]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const filteredMain = useMemo(() => {
    if (workspace === 'admin') {
      if (!websiteSection) {
        return [] as ErpNavSection[];
      }
      if (!searching) {
        return [websiteSection];
      }
      const items = websiteSection.items.filter((item) => item.label.toLowerCase().includes(q));
      return items.length > 0 ? [{ ...websiteSection, items }] : [];
    }
    if (!searching) {
      return mainSections;
    }
    return mainSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [mainSections, q, searching, websiteSection, workspace]);

  const filteredAccount = useMemo(() => {
    if (!accountSection) {
      return null;
    }
    if (!searching) {
      return accountSection;
    }
    const items = accountSection.items.filter((item) => item.label.toLowerCase().includes(q));
    return items.length > 0 ? { ...accountSection, items } : null;
  }, [accountSection, q, searching]);

  const filteredSearchHits = useMemo(() => {
    if (!searching || workspace !== 'erp') {
      return [] as ErpNavItem[];
    }
    return searchExtra.filter((item) => item.label.toLowerCase().includes(q));
  }, [q, searchExtra, searching, workspace]);

  const allSiblingHrefs = useMemo(
    () => [...sections.flatMap((section) => section.items.map((item) => item.href)), ...searchExtra.map((item) => item.href)],
    [searchExtra, sections],
  );

  const switchWorkspace = (next: StaffWorkspace) => {
    if (next === workspace) {
      return;
    }
    setWorkspace(next);
    persistWorkspace(next);
    router.push(workspaceHomePath(next));
  };

  if (auth.loading || !auth.user || !auth.tenant || !workspaceReady) {
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

  const renderItemList = (items: ErpNavItem[], dense = false) => {
    const hrefs = items.map((item) => item.href);
    return (
      <ul className={cn('space-y-1', dense && 'space-y-0.5')}>
        {items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <NavLink
              item={item}
              active={navActive(pathname, search, item.href, [...hrefs, ...allSiblingHrefs])}
              className={dense ? 'py-2 text-[13px] text-muted-foreground data-[active=true]:text-[hsl(var(--erp-lime-foreground))]' : undefined}
            />
          </li>
        ))}
      </ul>
    );
  };

  const renderSection = (section: ErpNavSection) => {
    if (section.items.length === 1 || section.id === 'website') {
      if (section.items.length === 1) {
        const item = section.items[0]!;
        return (
          <div key={section.id}>
            <NavLink item={item} active={navActive(pathname, search, item.href, allSiblingHrefs)} />
          </div>
        );
      }
      return (
        <div key={section.id} className="space-y-1">
          {section.items.map((item) => (
            <NavLink
              key={`${item.href}-${item.label}`}
              item={item}
              active={navActive(pathname, search, item.href, allSiblingHrefs)}
            />
          ))}
        </div>
      );
    }

    if (searching) {
      return (
        <div key={section.id}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {section.label}
          </p>
          {renderItemList(section.items)}
        </div>
      );
    }

    const expanded = expandedId === section.id;
    return (
      <div key={section.id}>
        <button
          type="button"
          className="erp-nav-pill w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          onClick={() => setExpandedId((current) => (current === section.id ? null : section.id))}
        >
          {(() => {
            const Icon = navIconFor(section.items[0]?.href ?? section.id);
            return <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />;
          })()}
          <span className="flex-1 truncate">{section.label}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 opacity-60 transition-transform', expanded ? 'rotate-0' : '-rotate-90')}
            aria-hidden
          />
        </button>
        {expanded ? <div className="mt-1 pl-2">{renderItemList(section.items)}</div> : null}
      </div>
    );
  };

  const showRegister = workspace === 'erp' && registerItem && (!searching || registerItem.label.toLowerCase().includes(q));
  const hasNavContent =
    Boolean(showRegister) ||
    filteredMain.length > 0 ||
    filteredSearchHits.length > 0 ||
    Boolean(filteredAccount);

  const sidebar = (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-4 flex items-center gap-2.5 px-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background"
          aria-hidden
        >
          J
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">{brand}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {workspace === 'admin' ? 'Website' : 'ERP'} workspace
          </p>
        </div>
      </div>

      {showWorkspaceSwitch ? (
        <div className="mb-4 px-1">
          <WorkspaceSwitch active={workspace} onChange={switchWorkspace} />
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 overflow-y-auto pb-4" aria-label="Staff navigation">
        {showRegister ? (
          <a
            href={registerItem.href}
            className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[hsl(var(--erp-lime))] px-4 py-3 text-sm font-semibold text-[hsl(var(--erp-lime-foreground))] shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
            <span>Open Register</span>
          </a>
        ) : null}

        <div className="space-y-1">{filteredMain.map((section) => renderSection(section))}</div>

        {filteredSearchHits.length > 0 ? (
          <div className="pt-3">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              More pages
            </p>
            {renderItemList(filteredSearchHits)}
          </div>
        ) : null}

        {filteredAccount ? (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {filteredAccount.label}
            </p>
            {renderItemList(filteredAccount.items, true)}
          </div>
        ) : null}

        {!hasNavContent ? <p className="px-3 text-sm text-muted-foreground">No matching pages.</p> : null}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/60 pt-3">
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

export function ErpShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--erp-canvas))] text-sm text-muted-foreground">
          Loading workspace…
        </div>
      }
    >
      <ErpShellInner>{children}</ErpShellInner>
    </Suspense>
  );
}

export { ERP_NAV };
