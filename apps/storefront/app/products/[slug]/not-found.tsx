import { EmptyState } from '../../../components/ui/empty-state';

export default function ProductNotFound(): React.JSX.Element {
  return (
    <EmptyState
      title="Product not found"
      description="This product is unavailable or no longer sold in this store."
      actionHref="/products"
      actionLabel="Browse products"
    />
  );
}
