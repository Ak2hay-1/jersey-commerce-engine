import type { AuthMeResponse, AuthTokenResponse, AuthUser, LoginTenantOption, PermissionCode } from '@jersey-commerce/types';
import { getApiUrl } from './env';

const ACCESS_KEY = 'jersey-staff-access-token';
const REFRESH_KEY = 'jersey-staff-refresh-token';
const LEGACY_ACCESS_KEYS = ['jersey-pos-access-token', 'jersey-admin-access-token'] as const;
const LEGACY_REFRESH_KEYS = ['jersey-pos-refresh-token', 'jersey-admin-refresh-token'] as const;

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { message: string; code?: string };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readStoredToken(primary: string, legacyKeys: readonly string[]): string {
  const current = window.localStorage.getItem(primary);
  if (current) {
    return current;
  }
  for (const key of legacyKeys) {
    const legacy = window.localStorage.getItem(key);
    if (legacy) {
      window.localStorage.setItem(primary, legacy);
      window.localStorage.removeItem(key);
      return legacy;
    }
  }
  return '';
}

export function readAccessToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return readStoredToken(ACCESS_KEY, LEGACY_ACCESS_KEYS);
}

export function readRefreshToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return readStoredToken(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  for (const key of LEGACY_ACCESS_KEYS) {
    window.localStorage.removeItem(key);
  }
  for (const key of LEGACY_REFRESH_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  for (const key of LEGACY_ACCESS_KEYS) {
    window.localStorage.removeItem(key);
  }
  for (const key of LEGACY_REFRESH_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.code === 'RESOURCE_NOT_FOUND');
}

async function parseBody<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!payload.success) {
    throw new ApiError(payload.error.message, response.status, payload.error.code);
  }
  return payload.data;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  const token = readAccessToken();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${getApiUrl()}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('authorization', `Bearer ${readAccessToken()}`);
      const retry = await fetch(`${getApiUrl()}/api/v1${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
      return parseBody<T>(retry);
    }
  }
  if (response.status === 401) {
    clearTokens();
  }
  return parseBody<T>(response);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as ApiSuccess<AuthTokenResponse> | ApiFailure;
    if (!payload.success) {
      return false;
    }
    storeTokens(payload.data.accessToken, payload.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export function login(input: { email: string; password: string; tenantSlug?: string }): Promise<AuthTokenResponse> {
  return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function listLoginTenants(): Promise<{ items: LoginTenantOption[] }> {
  return apiRequest('/auth/login-tenants');
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
  return apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(input) });
}

export function logout(): Promise<{ ok?: boolean }> {
  const refreshToken = readRefreshToken();
  return apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export function getMe(): Promise<AuthMeResponse> {
  return apiRequest('/auth/me');
}

export function hasPermission(user: AuthUser | null, code: PermissionCode): boolean {
  return Boolean(user?.permissions.includes(code));
}

export function queryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}
