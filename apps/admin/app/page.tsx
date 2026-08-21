'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { staffHomePath } from '@jersey-commerce/types';
import { useAuth } from '@/lib/auth';
import { getStaffPortal } from '@/lib/env';

export default function HomePage(): React.JSX.Element {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) {
      return;
    }
    if (!auth.user) {
      router.replace('/login');
      return;
    }
    if (auth.user.mustChangePassword) {
      router.replace('/change-password');
      return;
    }
    router.replace(staffHomePath(getStaffPortal(), auth.permissions));
  }, [auth.loading, auth.permissions, auth.user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      Opening workspace…
    </div>
  );
}
