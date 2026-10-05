import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RequireCustomer } from '../../components/account/require-customer';
import { AccountNav } from '../../components/account/account-nav';

export const metadata: Metadata = { title: 'Account' };

export default function AccountLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <RequireCustomer>
      <div className="mx-auto max-w-store space-y-8 store-gutter pb-[var(--space-section)] pt-8 md:pt-12">
        <div className="space-y-6">
          <p className="section-kicker">My account</p>
          <AccountNav />
        </div>
        {children}
      </div>
    </RequireCustomer>
  );
}
