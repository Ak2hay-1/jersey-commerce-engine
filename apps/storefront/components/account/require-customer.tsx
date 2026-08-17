'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../providers/auth-provider';
import { LoadingSkeleton } from '../ui/loading-skeleton';

export function RequireCustomer({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { customer, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !customer) {
      router.replace('/auth/login');
    }
  }, [customer, loading, router]);

  if (loading || !customer) {
    return (
      <div className="mx-auto max-w-store space-y-3 px-4 py-16">
        <LoadingSkeleton className="h-8 w-40" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
