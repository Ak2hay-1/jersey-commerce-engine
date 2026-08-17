'use client';

import { ProductImage } from '../catalog/product-image';

export function KenBurnsBackdrop({ src }: { src: string }): React.JSX.Element {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <ProductImage src={src} alt="" className="animate-ken-burns object-cover" sizes="100vw" priority fill />
    </div>
  );
}
