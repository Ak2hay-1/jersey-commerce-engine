'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Package, UserRound } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';

const TABS = [
  { href: '/account', label: 'Overview', icon: LayoutGrid },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/profile', label: 'Profile', icon: UserRound },
] as const;

export function AccountNav(): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="rail-scroll -mx-1 flex gap-1 overflow-x-auto border-b border-white/10 px-1" aria-label="Account">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/account' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-12 shrink-0 items-center gap-2 px-4 text-sm font-medium transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[hsl(var(--accent))]" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
