import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { RequireCustomer } from '../../components/account/require-customer';

export const metadata: Metadata = { title: 'Account' };

function AccountNav(): React.JSX.Element {
  return (
    <nav className="flex flex-wrap gap-4 text-sm uppercase tracking-wide">
      <Link href="/account">Overview</Link>
      <Link href="/account/orders">Orders</Link>
      <Link href="/account/profile">Profile</Link>
    </nav>
  );
}

export default function AccountLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <RequireCustomer>
      <div className="mx-auto max-w-store space-y-8 px-4 py-10">
        <AccountNav />
        {children}
      </div>
    </RequireCustomer>
  );
}
