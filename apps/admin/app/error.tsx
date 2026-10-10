'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@jersey-commerce/ui';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">This screen failed to load. Your saved data is not affected.</p>
        <div className="flex justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign('/dashboard')}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
