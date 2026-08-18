import { cn } from '@jersey-commerce/ui';

export function LoadingSkeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={cn('skeleton-shimmer rounded-sm', className)} />;
}

export function ProductCardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      <LoadingSkeleton className="aspect-[3/4] w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
      <LoadingSkeleton className="h-4 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
