'use client';

import { EmptyState } from '../../components/ui/empty-state';

export default function CheckoutError({ reset }: { error: Error; reset: () => void }): React.JSX.Element {
  return (
    <div className="py-8">
      <EmptyState
        title="Checkout unavailable"
        description="We could not start checkout. Check your cart and try again."
        actionHref="/cart"
        actionLabel="Return to cart"
      />
      <div className="mt-4 text-center">
        <button type="button" className="text-sm underline" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
