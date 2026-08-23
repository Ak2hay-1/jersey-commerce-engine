/**
 * Reset staff accounts for a tenant (CommonJS — runs inside the production API container).
 */
const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const TENANT_SLUG = (process.env.TENANT_SLUG || 'jerzyfy').trim();
const STAFF_PASSWORD = (process.env.STAFF_PASSWORD || 'DevPassword123!').trim();

const STAFF = {
  SUPER_ADMIN: {
    email: 'rkyves.com@gmail.com',
    name: 'Super Admin',
  },
  OWNER: {
    email: 'jerzyfyy@gmail.com',
    name: 'Jerzyfy Owner',
  },
};

const STAFF_ROLE_CODES = ['SUPER_ADMIN', 'OWNER'];

async function reassignUserReferences(tenantId, from, to) {
  await prisma.customerNote.updateMany({ where: { tenantId, createdBy: from }, data: { createdBy: to } });
  await prisma.customerTag.updateMany({ where: { tenantId, createdBy: from }, data: { createdBy: to } });
  await prisma.sale.updateMany({ where: { tenantId, cashierId: from }, data: { cashierId: to } });
  await prisma.sale.updateMany({ where: { tenantId, cancelledById: from }, data: { cancelledById: to } });
  await prisma.posSession.updateMany({ where: { tenantId, userId: from }, data: { userId: to } });
  await prisma.posCart.updateMany({ where: { tenantId, userId: from }, data: { userId: to } });
  await prisma.order.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.order.updateMany({ where: { tenantId, cancelledById: from }, data: { cancelledById: to } });
  await prisma.payment.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.refund.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.expense.updateMany({ where: { tenantId, createdBy: from }, data: { createdBy: to } });
  await prisma.expense.updateMany({ where: { tenantId, voidedById: from }, data: { voidedById: to } });
  await prisma.promoCode.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrderNote.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.purchase.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.purchase.updateMany({ where: { tenantId, cancelledById: from }, data: { cancelledById: to } });
  await prisma.purchaseReceipt.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.supplierPayment.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrder.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrder.updateMany({ where: { tenantId, cancelledById: from }, data: { cancelledById: to } });
  await prisma.customOrderQuote.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrderDesign.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrderDesignApproval.updateMany({
    where: { tenantId, decidedByUserId: from },
    data: { decidedByUserId: to },
  });
  await prisma.customOrderFile.updateMany({ where: { tenantId, uploadedById: from }, data: { uploadedById: to } });
  await prisma.customOrderTimelineEvent.updateMany({ where: { tenantId, createdById: from }, data: { createdById: to } });
  await prisma.customOrderProductionEvent.updateMany({
    where: { tenantId, createdById: from },
    data: { createdById: to },
  });
  await prisma.auditLog.updateMany({ where: { tenantId, userId: from }, data: { userId: to } });
}

async function removeStaffUser(tenantId, userId, reassignToUserId) {
  if (userId === reassignToUserId) {
    return;
  }

  await prisma.refreshToken.deleteMany({ where: { userId } });
  await reassignUserReferences(tenantId, userId, reassignToUserId);
  await prisma.userRole.deleteMany({ where: { userId, tenantId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) {
    throw new Error(`Tenant not found for slug "${TENANT_SLUG}".`);
  }

  const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 12);
  const roleByCode = new Map();

  for (const code of STAFF_ROLE_CODES) {
    const role = await prisma.role.findUnique({
      where: { tenantId_code: { tenantId: tenant.id, code } },
    });
    if (!role) {
      throw new Error(`Missing role ${code} on tenant ${TENANT_SLUG}.`);
    }
    roleByCode.set(code, role);
  }

  const keepEmails = new Set(Object.values(STAFF).map((entry) => entry.email.toLowerCase()));

  for (const code of STAFF_ROLE_CODES) {
    const staff = STAFF[code];
    const role = roleByCode.get(code);
    if (!role) {
      throw new Error(`Missing role record for ${code}.`);
    }

    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: staff.email } },
      update: {
        name: staff.name,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
      create: {
        tenantId: tenant.id,
        name: staff.name,
        email: staff.email,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    await prisma.userRole.deleteMany({
      where: { userId: user.id, tenantId: tenant.id, roleId: { not: role.id } },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: role.id,
      },
    });
  }

  const superAdmin = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: STAFF.SUPER_ADMIN.email },
  });

  const extras = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  for (const user of extras) {
    if (!keepEmails.has(user.email.toLowerCase())) {
      console.log(`Removing staff user ${user.email}`);
      await removeStaffUser(tenant.id, user.id, superAdmin.id);
    }
  }

  console.log(`Staff reset complete for tenant "${TENANT_SLUG}".`);
  console.log(`Super Admin: ${STAFF.SUPER_ADMIN.email}`);
  console.log(`Owner: ${STAFF.OWNER.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
