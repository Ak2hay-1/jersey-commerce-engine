import { cn } from '@jersey-commerce/ui';

export function LoadingSkeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />;
}

export function ProductCardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2.5">
      <LoadingSkeleton className="aspect-[4/5] w-full rounded-[var(--radius)]" />
      <LoadingSkeleton className="h-3 w-1/3" />
      <LoadingSkeleton className="h-4 w-4/5" />
      <LoadingSkeleton className="h-5 w-1/4" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
