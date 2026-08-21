'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getCurrentSession } from '@/lib/pos-api';

export default function HomePage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();

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
    if (!auth.can('pos.access')) {
      router.replace('/register');
      return;
    }
    void getCurrentSession()
      .then((session) => {
        router.replace(session ? '/register' : '/session/open');
      })
      .catch(() => {
        router.replace('/session/open');
      });
  }, [auth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 text-sm text-muted-foreground">
      Opening register…
    </div>
  );
}
