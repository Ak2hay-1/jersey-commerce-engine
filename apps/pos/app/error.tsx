'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@jersey-commerce/ui';

export default function PosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Register hit a problem</h1>
        <p className="text-sm text-muted-foreground">
          The cart is saved on the server. Try again, or reload the register if this keeps happening.
        </p>
        <div className="flex justify-center gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.assign('/register')}>
            Reload register
          </Button>
        </div>
      </div>
    </div>
  );
}
