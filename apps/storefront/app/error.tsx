'use client';

import { EmptyState } from '../components/ui/empty-state';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }): React.JSX.Element {
  return (
    <div className="py-8">
      <EmptyState
        title="Something went wrong"
        description="The store could not load this page. Try again, or continue shopping."
        actionHref="/products"
        actionLabel="Continue shopping"
      />
      <div className="text-center">
        <button type="button" className="text-sm underline" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
