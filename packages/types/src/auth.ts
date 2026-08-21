import type { TenantSummary } from './tenant';
import type { RoleCode, UserStatus } from './enums';
import type { PermissionCode } from './permissions';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  roles: RoleCode[];
  permissions: PermissionCode[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginTenantOption {
  name: string;
  slug: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export interface AuthMeResponse {
  user: AuthUser;
  tenant: TenantSummary;
  roles: RoleCode[];
  permissions: PermissionCode[];
}
