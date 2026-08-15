import type {
  AuthMeResponse,
  AuthTokenResponse,
  AuthUser,
  BackupRun,
  BackupSettings,
  PermissionCode,
  TenantSummary,
  UpdateBackupSettingsInput,
} from '@jersey-commerce/types';
import { publicEnv } from './env';

const ACCESS_KEY = 'jersey-admin-access-token';
const REFRESH_KEY = 'jersey-admin-refresh-token';

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

export function readAccessToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(ACCESS_KEY) ?? '';
}

export function readRefreshToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(REFRESH_KEY) ?? '';
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function parseBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/csv')) {
    return (await response.blob()) as T;
  }
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
  const response = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('authorization', `Bearer ${readAccessToken()}`);
      const retry = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
      if (!retry.ok && retry.status !== 200) {
        return parseBody<T>(retry);
      }
      return parseBody<T>(retry);
    }
  }
  if (response.status === 401) {
    clearTokens();
  }
  if (!response.ok && response.headers.get('content-type')?.includes('text/csv')) {
    throw new ApiError('Export failed', response.status);
  }
  if (response.headers.get('content-type')?.includes('text/csv')) {
    return (await response.blob()) as T;
  }
  return parseBody<T>(response);
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
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

export function logout(): Promise<{ success?: boolean } | Record<string, never>> {
  const refreshToken = readRefreshToken();
  return apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
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
