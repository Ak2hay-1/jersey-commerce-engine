import { ProductGridSkeleton } from '../components/ui/loading-skeleton';

export default function Loading(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-store space-y-6 px-4 py-10">
      <div className="skeleton-shimmer h-10 w-48" />
      <ProductGridSkeleton />
    </div>
  );
}
