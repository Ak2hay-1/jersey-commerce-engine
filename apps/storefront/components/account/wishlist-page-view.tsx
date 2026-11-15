'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { useWishlist } from '../providers/wishlist-provider';
import { ProductCard } from '../catalog/product-card';
import { EmptyState } from '../ui/empty-state';
import { LoadingSkeleton } from '../ui/loading-skeleton';
import { useStore } from '../providers/store-provider';

export function WishlistPageView(): React.JSX.Element {
  const { slugs, ready, remove } = useWishlist();
  const { tenant } = useStore();
  const [products, setProducts] = useState<StorefrontProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (slugs.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all(
      slugs.map(async (slug) => {
        try {
          const detail = await storeApi.product(slug);
          const availability =
            detail.variants.every((variant) => variant.availability === 'OUT_OF_STOCK')
              ? 'OUT_OF_STOCK'
              : detail.variants.some((variant) => variant.availability === 'LOW_STOCK')
                ? 'LOW_STOCK'
                : 'IN_STOCK';
          const listItem: StorefrontProductListItem = {
            id: detail.id,
            slug: detail.slug,
            name: detail.name,
            brand: detail.brand,
            status: 'ACTIVE',
            featured: detail.featured,
            category: detail.category,
            primaryImage: detail.images[0] ?? null,
            lowestPrice: detail.lowestPrice,
            highestPrice: detail.highestPrice,
            compareAtPrice: detail.compareAtPrice,
            variantCount: detail.variants.length,
            availability,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
          };
          return listItem;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (cancelled) {
        return;
      }
      const next = rows.filter((row): row is StorefrontProductListItem => Boolean(row));
      setProducts(next);
      const missing = slugs.filter((slug) => !next.some((product) => product.slug === slug));
      for (const slug of missing) {
        remove(slug);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally depend on slug list identity via join; remove is stable enough for cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, slugs.join('|')]);

  if (!ready || loading) {
    return (
      <div className="mx-auto max-w-store space-y-4 store-gutter py-10" aria-busy="true">
        <LoadingSkeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <LoadingSkeleton className="aspect-[4/5] w-full" />
          <LoadingSkeleton className="aspect-[4/5] w-full" />
          <LoadingSkeleton className="aspect-[4/5] w-full" />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-7 w-7" />}
        title="Your wishlist is empty"
        description="Tap the heart on a product page to save kits for later."
        actionHref="/products"
        actionLabel="Browse jerseys"
      />
    );
  }

  return (
    <div className="mx-auto max-w-store store-gutter py-10 md:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)]">Wishlist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length} saved {products.length === 1 ? 'kit' : 'kits'}
          </p>
        </div>
        <Link href="/products" className="section-link">
          Continue shopping
        </Link>
      </div>
      <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id} className="relative">
            <ProductCard product={product} currency={tenant.currency} />
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-full border border-white/20 bg-black/50 px-2 py-1 text-[11px] uppercase tracking-wider text-white backdrop-blur"
              onClick={() => remove(product.slug)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
