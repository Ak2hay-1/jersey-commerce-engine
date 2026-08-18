'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthMeResponse, AuthUser, PermissionCode, TenantSummary } from '@jersey-commerce/types';
import { clearTokens, getMe, login as loginRequest, logout as logoutRequest, storeTokens } from './api';

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
    try {
      const next = await getMe();
      setMe(next);
    } catch {
      setMe(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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
