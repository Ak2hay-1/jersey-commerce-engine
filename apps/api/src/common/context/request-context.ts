import { AsyncLocalStorage } from 'node:async_hooks';
import type { PermissionCode, RoleCode, UserStatus } from '@jersey-commerce/types';

export interface AuthPrincipal {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  status: UserStatus;
  mustChangePassword: boolean;
  roles: RoleCode[];
  permissions: PermissionCode[];
  tokenVersion: number;
  tenantSlug: string;
  tenantName: string;
  tokenJti: string;
}

export interface RequestContextStore {
  tenantId?: string;
  userId?: string;
  principal?: AuthPrincipal;
  bypassTenantScope: boolean;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContextStorage.getStore();
}

export function runWithContext<T>(store: RequestContextStore, fn: () => T): T {
  return requestContextStorage.run(store, fn);
}

export function withoutTenantScope<T>(fn: () => T): T {
  const current = getRequestContext();
  return runWithContext(
    {
      tenantId: current?.tenantId,
      userId: current?.userId,
      principal: current?.principal,
      bypassTenantScope: true,
    },
    fn,
  );
}
