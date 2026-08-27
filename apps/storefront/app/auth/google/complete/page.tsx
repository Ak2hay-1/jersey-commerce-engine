'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '../../../../components/ui/alert';
import { useAuth } from '../../../../components/providers/auth-provider';
import { publicErrorMessage } from '../../../../lib/errors';
import { COMPLETE_PROFILE_PATH, isProfileComplete } from '../../../../lib/profile';

function CompleteGoogle(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const { completeGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticket = params.get('ticket');
    if (!ticket) {
      setError('Google sign-in did not return a session ticket.');
      return;
    }
    void (async () => {
      try {
        const customer = await completeGoogle(ticket);
        router.replace(isProfileComplete(customer) ? '/account' : COMPLETE_PROFILE_PATH);
        router.refresh();
      } catch (caught) {
        setError(publicErrorMessage(caught, 'Could not finish Google sign-in.'));
      }
    })();
  }, [completeGoogle, params, router]);

  return (
    <div className="mx-auto max-w-md space-y-4 store-gutter py-12 md:py-16">
      <h1 className="font-heading text-3xl uppercase tracking-wide md:text-4xl">Google Sign-In</h1>
      {error ? <Alert tone="danger">{error}</Alert> : <p className="text-sm text-muted-foreground">Finishing sign-in…</p>}
    </div>
  );
}

export default function GoogleCompletePage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-sm text-muted-foreground">Finishing sign-in…</p>}>
      <CompleteGoogle />
    </Suspense>
  );
}
