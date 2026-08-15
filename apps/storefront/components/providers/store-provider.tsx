'use client';

import { createContext, useContext } from 'react';
import type { StorefrontBootstrap } from '@jersey-commerce/types';

const StoreContext = createContext<StorefrontBootstrap | null>(null);

export function StoreProvider({
  value,
  children,
}: {
  value: StorefrontBootstrap;
  children: React.ReactNode;
}): React.JSX.Element {
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StorefrontBootstrap {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('StoreProvider is required.');
  }
  return value;
}
