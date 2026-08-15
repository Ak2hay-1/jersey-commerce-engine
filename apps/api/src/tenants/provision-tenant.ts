import type { RoleCode, Tenant, User } from '../prisma/client';
import { asTx } from '../prisma/as-tx';
import { seedTenantRolesForClient, type RbacDb } from '../rbac/rbac.service';

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPasswordHash: string;
  ownerName: string;
}

export async function provisionTenant(
  db: RbacDb & {
    tenant: { create: (args: unknown) => Promise<Tenant> };
    user: { create: (args: unknown) => Promise<User> };
    userRole: { create: (args: unknown) => Promise<unknown> };
  },
  input: ProvisionTenantInput,
): Promise<{ tenant: Tenant; owner: User }> {
  const tenant = await db.tenant.create({
    data: {
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      status: 'ACTIVE',
    },
  } as never);
  await seedTenantRolesForClient(db, tenant.id);
  const owner = await db.user.create({
    data: {
      tenantId: tenant.id,
      email: input.ownerEmail.trim().toLowerCase(),
      passwordHash: input.ownerPasswordHash,
      name: input.ownerName.trim(),
      status: 'ACTIVE',
    },
  } as never);
  const ownerRole = await asTx(db).role.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OWNER' satisfies RoleCode } },
  });
  if (!ownerRole) {
    throw new Error('Owner role was not created for the new tenant.');
  }
  await db.userRole.create({
    data: { userId: owner.id, roleId: ownerRole.id, tenantId: tenant.id },
  } as never);
  await asTx(db).documentSequence.create({
    data: {
      tenantId: tenant.id,
      documentType: 'SALE_INVOICE',
      prefix: 'INV',
      nextNumber: 1,
      padLength: 6,
    },
  });
  await asTx(db).documentSequence.create({
    data: {
      tenantId: tenant.id,
      documentType: 'PURCHASE_ORDER',
      prefix: 'PO',
      nextNumber: 1,
      padLength: 6,
    },
  });
  await asTx(db).documentSequence.create({
    data: {
      tenantId: tenant.id,
      documentType: 'ORDER',
      prefix: 'ORD',
      nextNumber: 1,
      padLength: 6,
    },
  });
  return { tenant, owner };
}
