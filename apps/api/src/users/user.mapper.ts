import type { AuthUser, PermissionCode, RoleCode, TenantSummary } from '@jersey-commerce/types';
import type { RoleCode as PrismaRoleCode, Tenant, TenantStatus, User, UserStatus } from '../prisma/client';
import { isPermissionCode } from '../rbac/rbac.service';
import type { AuthPrincipal } from '../common/context/request-context';

export const userAuthInclude = {
  tenant: true,
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

export type UserWithAuth = User & {
  tenant: Tenant;
  userRoles: Array<{
    role: {
      code: PrismaRoleCode;
      rolePermissions: Array<{ permission: { code: string } }>;
    };
  }>;
};

export function rolesFromUser(user: UserWithAuth): RoleCode[] {
  return user.userRoles.map((assignment) => assignment.role.code as RoleCode);
}

export function permissionsFromUser(user: UserWithAuth): PermissionCode[] {
  const unique = new Set<PermissionCode>();
  for (const assignment of user.userRoles) {
    for (const rolePermission of assignment.role.rolePermissions) {
      if (isPermissionCode(rolePermission.permission.code)) {
        unique.add(rolePermission.permission.code);
      }
    }
  }
  return [...unique];
}

export function toAuthUser(user: UserWithAuth): AuthUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    phone: user.phone,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    roles: rolesFromUser(user),
    permissions: permissionsFromUser(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toTenantSummary(tenant: Tenant): TenantSummary {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    legalName: tenant.legalName,
    logo: tenant.logo,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    timezone: tenant.timezone,
    currency: tenant.currency,
    status: tenant.status,
  };
}

export function toAuthPrincipal(user: UserWithAuth, tokenJti: string): AuthPrincipal {
  const authUser = toAuthUser(user);
  return {
    userId: authUser.id,
    tenantId: authUser.tenantId,
    email: authUser.email,
    name: authUser.name,
    status: authUser.status,
    mustChangePassword: authUser.mustChangePassword,
    roles: authUser.roles,
    permissions: authUser.permissions,
    tokenVersion: user.tokenVersion,
    tenantSlug: user.tenant.slug,
    tenantName: user.tenant.name,
    tokenJti,
  };
}

export function isUserAllowedToAuthenticate(
  user: Pick<User, 'status'> & { tenant: Pick<Tenant, 'status'> },
): boolean {
  const tenantOk: TenantStatus[] = ['ACTIVE', 'TRIAL'];
  return user.status === 'ACTIVE' && tenantOk.includes(user.tenant.status);
}

export type { UserStatus };
