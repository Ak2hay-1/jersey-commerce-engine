'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { useAuth } from '../../components/providers/auth-provider';

export default function AccountPage(): React.JSX.Element {
  const { customer, logout } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-4xl uppercase tracking-wide">Account</h1>
      <p className="text-muted-foreground">Signed in as {customer?.name}.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/account/orders">Order history</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/profile">Edit profile</Link>
        </Button>
        <Button type="button" variant="ghost" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
