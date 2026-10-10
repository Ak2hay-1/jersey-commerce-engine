import type {
  AuthMeResponse,
  AuthTokenResponse,
  AuthUser,
  BackupRun,
  BackupSettings,
  LoginTenantOption,
  PermissionCode,
  TenantSummary,
  UpdateBackupSettingsInput,
} from '@jersey-commerce/types';
import { getApiUrl, isRefreshCookieOnly } from './env';

export const ACCESS_KEY = 'jersey-staff-access-token';
const REFRESH_KEY = 'jersey-staff-refresh-token';
const LEGACY_ACCESS_KEYS = ['jersey-admin-access-token', 'jersey-pos-access-token'] as const;
const LEGACY_REFRESH_KEYS = ['jersey-admin-refresh-token', 'jersey-pos-refresh-token'] as const;

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
  if (isRefreshCookieOnly()) {
    window.localStorage.removeItem(REFRESH_KEY);
  } else {
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }
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

async function parseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new ApiError('Export failed', response.status);
    }
    return (await response.blob()) as T;
  }
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      response.ok ? 'Unexpected response from the server.' : `The server is unavailable (HTTP ${response.status}). Try again shortly.`,
      response.status,
      'BAD_RESPONSE',
    );
  }
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!payload.success) {
    throw new ApiError(payload.error.message, response.status, payload.error.code);
  }
  return payload.data;
}

async function send(path: string, init: RequestInit, headers: Headers): Promise<Response> {
  try {
    return await fetch(`${getApiUrl()}/api/v1${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }
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
  let response = await send(path, init, headers);
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await tryRefresh()) {
      headers.set('authorization', `Bearer ${readAccessToken()}`);
      response = await send(path, init, headers);
    }
  }
  if (response.status === 401) {
    clearTokens();
  }
  return parseBody<T>(response);
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refresh tokens rotate on every use and the API revokes the whole session when an old one is replayed,
 * so concurrent 401s (in this tab or across tabs) must share a single refresh call.
 */
/** Single-flight access-token refresh; resolves false when the session can no longer be renewed. */
export function refreshAccessToken(): Promise<boolean> {
  return tryRefresh();
}

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshExclusive().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function refreshExclusive(): Promise<boolean> {
  const accessBefore = readAccessToken();
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) {
    return performRefresh();
  }
  return locks.request('jersey-staff-token-refresh', async () => {
    const accessNow = readAccessToken();
    if (accessNow && accessNow !== accessBefore) {
      return true;
    }
    return performRefresh();
  });
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken();
  if (!refreshToken && !isRefreshCookieOnly()) {
    return false;
  }
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
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

export function logout(): Promise<{ success?: boolean } | Record<string, never>> {
  const refreshToken = readRefreshToken();
  return apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify(refreshToken ? { refreshToken } : {}) });
}

export function getMe(): Promise<AuthMeResponse> {
  return apiRequest('/auth/me');
}

export function hasPermission(user: AuthUser | null, code: PermissionCode): boolean {
  return Boolean(user?.permissions.includes(code));
}

const TENANT_STORAGE_KEY = 'jersey-admin-tenant-id';

export function readStoredTenantId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(TENANT_STORAGE_KEY) ?? '';
}

export function storeTenantId(tenantId: string): void {
  window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
}

export async function listTenants(): Promise<{ items: TenantSummary[] }> {
  const me = await getMe();
  return { items: [me.tenant] };
}

export function getBackupSettings(tenantId?: string): Promise<BackupSettings> {
  void tenantId;
  return apiRequest('/backups/settings');
}

export function saveBackupSettings(tenantId: string, input: UpdateBackupSettingsInput): Promise<BackupSettings> {
  void tenantId;
  return apiRequest('/backups/settings', { method: 'PUT', body: JSON.stringify(input) });
}

export function runBackupNow(tenantId?: string): Promise<BackupRun> {
  void tenantId;
  return apiRequest('/backups/run', { method: 'POST' });
}

export function listBackupRuns(tenantId?: string): Promise<{ items: BackupRun[] }> {
  void tenantId;
  return apiRequest('/backups/runs');
}

export function queryString(params: Record<string, string | number | boolean | undefined | null>): string {
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
