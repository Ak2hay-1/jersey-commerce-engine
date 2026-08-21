'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StorefrontCustomer } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { STORE_COOKIES, clearBrowserCookie, writeBrowserCookie } from '../../lib/cookies';

type OtpInput = { channel: 'email' | 'sms'; email?: string; phone?: string; name?: string };

type AuthContextValue = {
  customer: StorefrontCustomer | null;
  loading: boolean;
  login: (input: { email?: string; phone?: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  requestOtp: (input: OtpInput) => Promise<void>;
  verifyOtp: (input: OtpInput & { code: string }) => Promise<void>;
  startGoogle: () => Promise<void>;
  completeGoogle: (ticket: string) => Promise<void>;
  logout: () => void;
  setCustomer: (customer: StorefrontCustomer | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [customer, setCustomer] = useState<StorefrontCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setCustomer(await storeApi.me());
      } catch {
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback((token: string, next: StorefrontCustomer) => {
    writeBrowserCookie(STORE_COOKIES.customer, token, 30 * 24 * 60 * 60);
    setCustomer(next);
  }, []);

  const login = useCallback(
    async (input: { email?: string; phone?: string; password: string }) => {
      const result = await storeApi.login(input);
      persist(result.accessToken, result.customer);
    },
    [persist],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const result = await storeApi.register(input);
      persist(result.accessToken, result.customer);
    },
    [persist],
  );

  const requestOtp = useCallback(async (input: OtpInput) => {
    await storeApi.requestOtp(input);
  }, []);

  const verifyOtp = useCallback(
    async (input: OtpInput & { code: string }) => {
      const result = await storeApi.verifyOtp(input);
      persist(result.accessToken, result.customer);
    },
    [persist],
  );

  const startGoogle = useCallback(async () => {
    const result = await storeApi.startGoogle({ origin: window.location.origin });
    window.location.assign(result.authorizationUrl);
  }, []);

  const completeGoogle = useCallback(
    async (ticket: string) => {
      const result = await storeApi.exchangeGoogle(ticket);
      persist(result.accessToken, result.customer);
    },
    [persist],
  );

  const logout = useCallback(() => {
    clearBrowserCookie(STORE_COOKIES.customer);
    setCustomer(null);
    void storeApi.logout();
  }, []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      login,
      register,
      requestOtp,
      verifyOtp,
      startGoogle,
      completeGoogle,
      logout,
      setCustomer,
    }),
    [customer, loading, login, register, requestOtp, verifyOtp, startGoogle, completeGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('AuthProvider is required.');
  }
  return value;
}
