import { LoadingSkeleton, ProductGridSkeleton } from '../../components/ui/loading-skeleton';

export default function ProductsLoading(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-store space-y-8 store-gutter pb-16 pt-8 md:pt-12">
      <div className="space-y-4">
        <LoadingSkeleton className="h-3 w-24" />
        <LoadingSkeleton className="h-12 w-72 max-w-full" />
        <div className="flex gap-2">
          <LoadingSkeleton className="h-9 w-24 rounded-full" />
          <LoadingSkeleton className="h-9 w-28 rounded-full" />
          <LoadingSkeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
      <LoadingSkeleton className="h-14 w-full" />
      <ProductGridSkeleton />
    </div>
  );
}
