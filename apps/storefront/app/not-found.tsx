import type { Metadata } from 'next';
import { EmptyState } from '../components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That page does not exist in this store.',
  robots: { index: false, follow: false },
};

export default function NotFoundPage(): React.JSX.Element {
  return (
    <EmptyState
      title="Page not found"
      description="That page does not exist in this store."
      actionHref="/"
      actionLabel="Back to home"
    />
  );
}
