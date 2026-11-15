'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readWishlistSlugs, writeWishlistSlugs } from '../../lib/wishlist';

type WishlistContextValue = {
  slugs: string[];
  ready: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSlugs(readWishlistSlugs());
    setReady(true);
  }, []);

  function persist(next: string[]) {
    setSlugs(next);
    writeWishlistSlugs(next);
  }

  const value: WishlistContextValue = {
    slugs,
    ready,
    has: (slug) => slugs.includes(slug),
    toggle: (slug) => {
      persist(slugs.includes(slug) ? slugs.filter((item) => item !== slug) : [...slugs, slug]);
    },
    remove: (slug) => persist(slugs.filter((item) => item !== slug)),
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const value = useContext(WishlistContext);
  if (!value) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return value;
}
