'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@jersey-commerce/ui';
import { resolveDemoMediaUrl } from '../../lib/demo-media';

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
  const resolved = resolveDemoMediaUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return <div className={cn('bg-muted', className)} aria-hidden="true" />;
  }

  const remote = resolved.startsWith('http');
  const unoptimized = remote || resolved.includes('placehold.co');

  if (fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <Image
      src={resolved}
      alt={alt}
      width={800}
      height={1000}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => setFailed(true)}
    />
  );
}
