import { EmptyState } from '../../../components/ui/empty-state';

export default function CategoryNotFound(): React.JSX.Element {
  return (
    <EmptyState
      title="Category not found"
      description="This collection is not available in this store."
      actionHref="/products"
      actionLabel="Browse products"
    />
  );
}
