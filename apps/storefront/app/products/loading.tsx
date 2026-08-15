import { ProductGridSkeleton } from '../../components/ui/loading-skeleton';

export default function ProductsLoading(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-store space-y-8 px-4 py-10">
      <div className="h-10 w-56 animate-pulse bg-muted" />
      <div className="h-24 animate-pulse bg-muted" />
      <ProductGridSkeleton />
    </div>
  );
}
