import { ProductGridSkeleton } from '../../components/ui/loading-skeleton';

export default function ProductsLoading(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-store space-y-8 store-gutter py-10">
      <div className="skeleton-shimmer h-10 w-56" />
      <div className="skeleton-shimmer h-24" />
      <ProductGridSkeleton />
    </div>
  );
}
