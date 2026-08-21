import { EXPENSE_CATEGORY_NAMES } from '@jersey-commerce/types';
import type { RoleCode, Tenant, User } from '../prisma/client';
import { asTx } from '../prisma/as-tx';
import { seedTenantRolesForClient, type RbacDb } from '../rbac/rbac.service';

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPasswordHash: string;
  ownerName: string;
  mustChangePassword?: boolean;
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
      mustChangePassword: input.mustChangePassword ?? false,
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
  const superAdminRole = await asTx(db).role.findUnique({
    where: { tenantId_code: { tenantId: tenant.id, code: 'SUPER_ADMIN' satisfies RoleCode } },
  });
  if (superAdminRole) {
    await db.userRole.create({
      data: { userId: owner.id, roleId: superAdminRole.id, tenantId: tenant.id },
    } as never);
  }
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
  await asTx(db).documentSequence.create({
    data: {
      tenantId: tenant.id,
      documentType: 'CUSTOM_ORDER',
      prefix: 'CO',
      nextNumber: 1,
      padLength: 6,
    },
  });
  await asTx(db).documentSequence.create({
    data: {
      tenantId: tenant.id,
      documentType: 'CUSTOM_ORDER_QUOTE',
      prefix: 'QT',
      nextNumber: 1,
      padLength: 6,
    },
  });
  await asTx(db).customizationOption.createMany({
    data: [
      { tenantId: tenant.id, name: 'Name printing', description: 'Player name on the back', pricingType: 'PER_ITEM', price: '150.00', sortOrder: 1 },
      { tenantId: tenant.id, name: 'Number printing', description: 'Jersey number on the back', pricingType: 'PER_ITEM', price: '120.00', sortOrder: 2 },
      { tenantId: tenant.id, name: 'Team logo', description: 'Club or team crest', pricingType: 'FIXED', price: '2500.00', sortOrder: 3 },
      { tenantId: tenant.id, name: 'Sponsor logo', description: 'Front sponsor print', pricingType: 'FIXED', price: '3500.00', sortOrder: 4 },
      { tenantId: tenant.id, name: 'Sleeve patch', description: 'Sleeve competition or sponsor patch', pricingType: 'PER_ITEM', price: '80.00', sortOrder: 5 },
      { tenantId: tenant.id, name: 'Custom design', description: 'Bespoke artwork and layout', pricingType: 'PERCENTAGE', price: '10.00', sortOrder: 6 },
    ],
  });
  await asTx(db).expenseCategory.createMany({
    data: EXPENSE_CATEGORY_NAMES.map((name) => ({
      tenantId: tenant.id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    })),
  });
  return { tenant, owner };
}
