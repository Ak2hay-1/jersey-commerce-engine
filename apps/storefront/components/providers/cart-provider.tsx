'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartDto } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { STORE_COOKIES, clearBrowserCookie, readBrowserCookie, writeBrowserCookie } from '../../lib/cookies';
import { StoreApiError, publicErrorMessage } from '../../lib/errors';

type CartContextValue = {
  cart: CartDto | null;
  open: boolean;
  loading: boolean;
  error: string | null;
  setOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  addItem: (productVariantId: string, quantity?: number) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rememberToken = useCallback((next: CartDto) => {
    if (next.cartToken) {
      writeBrowserCookie(STORE_COOKIES.cart, next.cartToken, 14 * 24 * 60 * 60);
    }
    setCart(next);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      try {
        rememberToken(await storeApi.getCart());
      } catch (error) {
        if (error instanceof StoreApiError && (error.status === 400 || error.status === 404)) {
          rememberToken(await storeApi.createCart());
          return;
        }
        throw error;
      }
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Cart is unavailable. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [rememberToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productVariantId: string, quantity = 1) => {
      setError(null);
      const addToCart = async () => rememberToken(await storeApi.addCartItem({ productVariantId, quantity }));
      try {
        if (!readBrowserCookie(STORE_COOKIES.cart)) {
          rememberToken(await storeApi.createCart());
        }
        await addToCart();
        setOpen(true);
      } catch (caught) {
        if (caught instanceof StoreApiError && (caught.status === 400 || caught.status === 404)) {
          rememberToken(await storeApi.createCart());
          await addToCart();
          setOpen(true);
          return;
        }
        throw caught;
      }
    },
    [rememberToken],
  );

  const updateItem = useCallback(
    async (id: string, quantity: number) => {
      rememberToken(await storeApi.updateCartItem(id, quantity));
    },
    [rememberToken],
  );

  const removeItem = useCallback(
    async (id: string) => {
      rememberToken(await storeApi.removeCartItem(id));
    },
    [rememberToken],
  );

  const applyPromo = useCallback(
    async (code: string) => {
      rememberToken(await storeApi.applyPromo(code));
    },
    [rememberToken],
  );

  const removePromo = useCallback(async () => {
    rememberToken(await storeApi.removePromo());
  }, [rememberToken]);

  const value = useMemo(
    () => ({ cart, open, loading, error, setOpen, refresh, addItem, updateItem, removeItem, applyPromo, removePromo }),
    [cart, open, loading, error, refresh, addItem, updateItem, removeItem, applyPromo, removePromo],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('CartProvider is required.');
  }
  return value;
}

export function clearCartSession(): void {
  clearBrowserCookie(STORE_COOKIES.cart);
}
