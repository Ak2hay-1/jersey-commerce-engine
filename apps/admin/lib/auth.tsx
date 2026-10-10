'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthMeResponse, AuthUser, PermissionCode, TenantSummary } from '@jersey-commerce/types';
import { ACCESS_KEY, ApiError, clearTokens, getMe, login as loginRequest, logout as logoutRequest, storeTokens } from './api';

const HYDRATE_ATTEMPTS = 5;

function isTransient(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

interface AuthState {
  loading: boolean;
  user: AuthUser | null;
  tenant: TenantSummary | null;
  permissions: PermissionCode[];
  login: (input: { email: string; password: string; tenantSlug?: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (code: PermissionCode) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AuthMeResponse | null>(null);

  const hydrate = useCallback(async () => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        setMe(await getMe());
        break;
      } catch (error) {
        if (isTransient(error) && attempt < HYDRATE_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
          continue;
        }
        setMe(null);
        if (!isTransient(error)) {
          clearTokens();
        }
        break;
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if ((event.key === ACCESS_KEY || event.key === null) && !event.newValue) {
        setMe(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user: me?.user ?? null,
      tenant: me?.tenant ?? null,
      permissions: me?.permissions ?? [],
      can: (code) => Boolean(me?.permissions.includes(code)),
      login: async (input) => {
        const tokens = await loginRequest(input);
        storeTokens(tokens.accessToken, tokens.refreshToken);
        const next = await getMe();
        setMe(next);
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          clearTokens();
          setMe(null);
        }
      },
    }),
    [loading, me],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
