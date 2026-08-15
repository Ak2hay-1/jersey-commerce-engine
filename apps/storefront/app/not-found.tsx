import { EmptyState } from '../components/ui/empty-state';

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
