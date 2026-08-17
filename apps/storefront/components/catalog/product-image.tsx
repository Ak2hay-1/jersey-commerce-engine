import Image from 'next/image';
import { cn } from '@jersey-commerce/ui';

export function ProductImage({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 768px) 50vw, 25vw',
  fill = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
}): React.JSX.Element {
  if (!src) {
    return <div className={cn('bg-muted', className)} aria-hidden="true" />;
  }
  const unoptimized = src.includes('placehold.co');
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={1000}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
    />
  );
}
