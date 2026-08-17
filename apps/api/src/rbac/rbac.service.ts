import { Injectable } from '@nestjs/common';
import type { Permission, RoleCode } from '../prisma/client';
import { PERMISSION_CATALOG, PERMISSION_CODES, ROLE_CODES, type PermissionCode } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { DEFAULT_ROLE_PERMISSIONS } from './default-role-permissions';

export type RbacDb = object;

export function roleDisplayName(code: RoleCode): string {
  switch (code) {
    case 'OWNER':
      return 'Owner';
    case 'MANAGER':
      return 'Manager';
    case 'CASHIER':
      return 'Cashier';
    case 'INVENTORY_MANAGER':
      return 'Inventory Manager';
    case 'WEBSITE_MANAGER':
      return 'Website Manager';
    default:
      return code;
  }
}

export function isPermissionCode(value: string): value is PermissionCode {
  return (PERMISSION_CODES as readonly string[]).includes(value);
}

export async function ensurePermissionCatalog(db: RbacDb): Promise<Permission[]> {
  const client = asTx(db);
  const records: Permission[] = [];
  for (const definition of PERMISSION_CATALOG) {
    const permission = await client.permission.upsert({
      where: { code: definition.code },
      create: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        group: definition.group,
      },
      update: {
        name: definition.name,
        description: definition.description,
        group: definition.group,
      },
    });
    records.push(permission);
  }
  return records;
}

export async function seedTenantRolesForClient(db: RbacDb, tenantId: string): Promise<void> {
  const client = asTx(db);
  const permissions = await ensurePermissionCatalog(client);
  const permissionByCode = new Map(permissions.map((permission) => [permission.code, permission]));

  for (const code of ROLE_CODES) {
    const role = await client.role.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: {
        tenantId,
        code,
        name: roleDisplayName(code),
      },
      update: { name: roleDisplayName(code) },
    });

    const mapped = DEFAULT_ROLE_PERMISSIONS[code];
    const keys = mapped === 'ALL' ? [...PERMISSION_CODES] : [...mapped];
    await client.rolePermission.deleteMany({ where: { roleId: role.id, tenantId } });
    await client.rolePermission.createMany({
      data: keys.map((key) => {
        const permission = permissionByCode.get(key);
        if (!permission) {
          throw new Error(`Missing permission catalog record for ${key}`);
        }
        return { roleId: role.id, permissionId: permission.id, tenantId };
      }),
    });
  }
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  ensurePermissionCatalog(db: RbacDb = this.prisma): Promise<Permission[]> {
    return ensurePermissionCatalog(db);
  }

  seedTenantRoles(tenantId: string, db: RbacDb = this.prisma): Promise<void> {
    return seedTenantRolesForClient(db, tenantId);
  }
}
