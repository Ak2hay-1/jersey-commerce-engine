import type { BackupIntervalUnit, BackupRun, BackupSettings, PaginatedData, TenantSummary } from '@jersey-commerce/types';
import { publicEnv } from './env';

const TENANT_STORAGE_KEY = 'jersey-admin-tenant-id';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { message: string };
}

async function request<T>(path: string, init: RequestInit & { tenantId?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (init.tenantId) {
    headers.set('x-tenant-id', init.tenantId);
  }

  const response = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/api/v1${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!payload.success) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

export function readStoredTenantId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(TENANT_STORAGE_KEY) ?? '';
}

export function storeTenantId(tenantId: string): void {
  window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
}

export function listTenants(): Promise<PaginatedData<TenantSummary>> {
  return request('/tenants?pageSize=100');
}

export function getBackupSettings(tenantId: string): Promise<BackupSettings> {
  return request('/backups/settings', { tenantId });
}

export function saveBackupSettings(
  tenantId: string,
  input: {
    enabled: boolean;
    destinationPath: string;
    scheduleTime: string;
    intervalValue: number;
    intervalUnit: BackupIntervalUnit;
    retainCopies: number;
  },
): Promise<BackupSettings> {
  return request('/backups/settings', {
    tenantId,
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function runBackupNow(tenantId: string): Promise<BackupRun> {
  return request('/backups/run', { tenantId, method: 'POST' });
}

export function listBackupRuns(tenantId: string): Promise<PaginatedData<BackupRun>> {
  return request('/backups/runs?pageSize=10', { tenantId });
}
