'use client';

import Link from 'next/link';
import { ArrowRight, LogOut, Package, UserRound } from 'lucide-react';
import { useAuth } from '../../components/providers/auth-provider';

const CARDS = [
  { href: '/account/orders', title: 'Order history', body: 'Track shipments and view past orders.', icon: Package },
  { href: '/account/profile', title: 'Profile & address', body: 'Update your details for faster checkout.', icon: UserRound },
] as const;

export default function AccountPage(): React.JSX.Element {
  const { customer, logout } = useAuth();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)]">
          Hi{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-2 text-muted-foreground">Signed in{customer?.email ? ` as ${customer.email}` : ''}.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, title, body, icon: Icon }) => (
          <Link key={href} href={href} className="panel group flex items-center gap-4 p-5 transition-colors hover:border-white/25 sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-xl uppercase tracking-wide">{title}</span>
              <span className="block text-sm text-muted-foreground">{body}</span>
            </span>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
      <button type="button" className="btn btn-ghost cursor-pointer px-3 text-muted-foreground" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </div>
  );
}
