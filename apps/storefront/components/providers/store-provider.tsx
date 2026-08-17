'use client';

import { createContext, useContext } from 'react';
import type { StorefrontBootstrap } from '@jersey-commerce/types';
import { DEFAULT_STORE_CHROME, type StoreChrome } from '../../lib/swatch';

export type { StoreChrome };

const StoreContext = createContext<StorefrontBootstrap | null>(null);
const ChromeContext = createContext<StoreChrome>(DEFAULT_STORE_CHROME);

export function StoreProvider({
  value,
  chrome = DEFAULT_STORE_CHROME,
  children,
}: {
  value: StorefrontBootstrap;
  chrome?: StoreChrome;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <StoreContext.Provider value={value}>
      <ChromeContext.Provider value={chrome}>{children}</ChromeContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore(): StorefrontBootstrap {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('StoreProvider is required.');
  }
  return value;
}

export function useStoreChrome(): StoreChrome {
  return useContext(ChromeContext);
}
