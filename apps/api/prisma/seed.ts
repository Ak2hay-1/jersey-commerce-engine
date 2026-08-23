/**
 * DEVELOPMENT SEED ONLY.
 *
 * Loads a clean Jerzyfy tenant with two staff accounts and no demo catalog or transactions.
 * Never use these credentials or the dev password in production.
 *
 * Seeded password for both users: DevPassword123!
 */
import { PrismaClient, RoleCode, type Prisma } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/rbac/default-role-permissions';
import { ROLE_CODES, type RoleCode as SharedRoleCode } from '../../../packages/types/src/enums';
import { PERMISSION_CATALOG, type PermissionCode } from '../../../packages/types/src/permissions';

const prisma = new PrismaClient();

const TENANT_SLUG = 'demo-jersey-store';
const SEED_PASSWORD = 'DevPassword123!';

const PRODUCTION_STAFF: Record<'SUPER_ADMIN' | 'OWNER', { email: string; name: string }> = {
  SUPER_ADMIN: {
    email: 'rkyves.com@gmail.com',
    name: 'Super Admin',
  },
  OWNER: {
    email: 'jerzyfyy@gmail.com',
    name: 'Jerzyfy Owner',
  },
};

const LEGACY_DEMO_EMAILS = [
  'owner@demo.local',
  'superadmin@demo.local',
  'manager@demo.local',
  'cashier@demo.local',
  'inventory@demo.local',
  'website@demo.local',
] as const;

const SEEDED_USER_ROLE_CODES: Array<'SUPER_ADMIN' | 'OWNER'> = ['SUPER_ADMIN', 'OWNER'];

const ROLE_NAMES: Record<
  SharedRoleCode,
  { name: string; description: string }
> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Protected full access for the operator and client. Cannot be assigned by other roles.',
  },
  OWNER: {
    name: 'Owner',
    description: 'Full access to the tenant',
  },
  MANAGER: {
    name: 'Manager',
    description: 'Day-to-day store operations except user administration',
  },
  CASHIER: {
    name: 'Cashier',
    description: 'POS sales, customers, and read-only catalog access. Discounts are not granted by default.',
  },
  INVENTORY_MANAGER: {
    name: 'Inventory Manager',
    description: 'Catalog, stock, and purchasing',
  },
  WEBSITE_MANAGER: {
    name: 'Website Manager',
    description: 'Storefront catalog presentation and website settings',
  },
};

const ROLE_PERMISSION_MAP: Record<SharedRoleCode, readonly PermissionCode[] | 'ALL'> = DEFAULT_ROLE_PERMISSIONS;

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Marketing',
  'Packaging',
  'Maintenance',
  'Miscellaneous',
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Reassign Restrict FKs then delete a user no longer needed. */
async function removeUser(
  tenantId: string,
  email: string,
  reassignToUserId: string,
): Promise<void> {
  const legacy = await prisma.user.findFirst({
    where: { tenantId, email: email.toLowerCase() },
  });
  if (!legacy || legacy.id === reassignToUserId) {
    return;
  }

  const from = legacy.id;
  const to = reassignToUserId;

  await prisma.customerNote.updateMany({ where: { tenantId, createdBy: from }, data: { createdBy: to } });
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

  await prisma.user.delete({ where: { id: from } });
}

async function main(): Promise<void> {
  console.warn('=== DEVELOPMENT SEED ONLY — do not use these credentials in production ===');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        group: permission.group,
      },
      create: {
        code: permission.code,
        name: permission.name,
        description: permission.description,
        group: permission.group,
      },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((item) => [item.code, item]));

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {
      name: 'Jerzyfy',
      legalName: 'Jerzyfy LLP',
      status: 'ACTIVE',
      primaryColor: '#111111',
      secondaryColor: '#8A8178',
      accentColor: '#7A1F1F',
      contactPhone: '+91 98765 00000',
      contactEmail: PRODUCTION_STAFF.OWNER.email,
      address: '12 Stadium Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      shippingCalculationMode: 'FIXED',
      shippingFixedAmount: 99,
      freeShippingMinSubtotal: 2000,
    },
    create: {
      name: 'Jerzyfy',
      legalName: 'Jerzyfy LLP',
      slug: TENANT_SLUG,
      status: 'ACTIVE',
      primaryColor: '#111111',
      secondaryColor: '#8A8178',
      accentColor: '#7A1F1F',
      contactPhone: '+91 98765 00000',
      contactEmail: PRODUCTION_STAFF.OWNER.email,
      address: '12 Stadium Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      shippingCalculationMode: 'FIXED',
      shippingFixedAmount: 99,
      freeShippingMinSubtotal: 2000,
    },
  });

  for (const host of ['demo-jersey-store.localhost', 'demo-jersey-store.platform.local']) {
    await prisma.tenantHost.upsert({
      where: { host },
      update: {
        tenantId: tenant.id,
        kind: host.endsWith('.localhost') ? 'SUBDOMAIN' : 'DOMAIN',
        isPrimary: host.endsWith('.localhost'),
      },
      create: {
        tenantId: tenant.id,
        host,
        kind: host.endsWith('.localhost') ? 'SUBDOMAIN' : 'DOMAIN',
        isPrimary: host.endsWith('.localhost'),
      },
    });
  }

  const roleRecords = new Map<SharedRoleCode, { id: string }>();

  for (const code of ROLE_CODES) {
    const meta = ROLE_NAMES[code];
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: code as RoleCode } },
      update: { name: meta.name, description: meta.description },
      create: {
        tenantId: tenant.id,
        code: code as RoleCode,
        name: meta.name,
        description: meta.description,
      },
    });
    roleRecords.set(code, role);
  }

  for (const code of SEEDED_USER_ROLE_CODES) {
    const staff = PRODUCTION_STAFF[code];
    const role = roleRecords.get(code);
    if (!role) {
      throw new Error(`Missing role record for ${code}`);
    }

    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: staff.email } },
      update: { name: staff.name, passwordHash, status: 'ACTIVE', mustChangePassword: false },
      create: {
        tenantId: tenant.id,
        name: staff.name,
        email: staff.email,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
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
    where: { tenantId: tenant.id, email: PRODUCTION_STAFF.SUPER_ADMIN.email },
  });

  for (const legacyEmail of LEGACY_DEMO_EMAILS) {
    await removeUser(tenant.id, legacyEmail, superAdmin.id);
  }

  const keepEmails = new Set(Object.values(PRODUCTION_STAFF).map((staff) => staff.email));
  const extraUsers = await prisma.user.findMany({ where: { tenantId: tenant.id } });
  for (const user of extraUsers) {
    if (!keepEmails.has(user.email.toLowerCase())) {
      await removeUser(tenant.id, user.email, superAdmin.id);
    }
  }

  await prisma.product.updateMany({
    where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } },
    data: { status: 'ARCHIVED', featured: false },
  });
  await prisma.productVariant.updateMany({
    where: { tenantId: tenant.id, status: { not: 'INACTIVE' } },
    data: { status: 'INACTIVE' },
  });
  await prisma.category.updateMany({
    where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } },
    data: { status: 'ARCHIVED' },
  });

  await prisma.rolePermission.deleteMany({ where: { tenantId: tenant.id } });

  for (const code of ROLE_CODES) {
    const role = roleRecords.get(code);
    if (!role) {
      continue;
    }
    const assigned = ROLE_PERMISSION_MAP[code];
    const codes = assigned === 'ALL' ? PERMISSION_CATALOG.map((item) => item.code) : assigned;

    await prisma.rolePermission.createMany({
      data: codes.flatMap((permissionCode) => {
        const permission = permissionByCode.get(permissionCode);
        if (!permission) {
          return [];
        }
        return [
          {
            tenantId: tenant.id,
            roleId: role.id,
            permissionId: permission.id,
          },
        ];
      }),
    });
  }

  const websitePayload = {
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    accentColor: tenant.accentColor,
    backgroundColor: '#F4F1EC',
    foregroundColor: '#111111',
    headingFont: 'Instrument Serif',
    bodyFont: 'Inter',
    homepageConfig: {
      sections: [
        {
          type: 'hero',
          enabled: true,
          heading: 'Welcome to Jerzyfy',
          subheading: 'Football jerseys for match day — add products in Admin to populate your storefront.',
          ctaLabel: 'Shop jerseys',
          ctaHref: '/products',
          slides: [
            {
              id: 'hero-1',
              heading: 'Welcome to Jerzyfy',
              subheading: 'Your football jersey store is ready. Add categories and products to go live.',
              ctaLabel: 'Browse catalog',
              ctaHref: '/products',
            },
          ],
        },
        {
          type: 'statement',
          enabled: true,
          heading: 'WEAR THE GAME',
          subheading: 'Club, national, kids, and custom kits.',
        },
        {
          type: 'new-arrivals',
          enabled: false,
          heading: 'Latest kits',
          productSlugs: [],
        },
        {
          type: 'featured-products',
          enabled: false,
          heading: 'Featured jerseys',
          productSlugs: [],
        },
        {
          type: 'featured-categories',
          enabled: false,
          heading: 'Shop by kit',
          categorySlugs: [],
        },
        {
          type: 'trust',
          enabled: true,
          heading: 'Built for match day',
          items: [
            { title: 'Quality jerseys', description: 'Replica-inspired football kits built to last.' },
            { title: 'Easy ordering', description: 'Shop online or visit the store.' },
            { title: 'Custom options', description: 'Name, number, and team printing available.' },
            { title: 'Support', description: 'Contact us for sizing help or bulk orders.' },
          ],
        },
        {
          type: 'cta',
          enabled: true,
          heading: 'Find your jersey',
          subheading: 'Browse the catalog or contact us for custom team orders.',
          ctaLabel: 'View products',
          ctaHref: '/products',
        },
      ],
    } as Prisma.InputJsonValue,
    contactPhone: tenant.contactPhone,
    contactEmail: tenant.contactEmail,
    contactAddress: `${tenant.address}, ${tenant.city}`,
    socialLinks: {
      instagram: 'https://instagram.com/jerzyfy',
      whatsapp: 'https://wa.me/919876500000',
    } as Prisma.InputJsonValue,
    businessHours: {
      monday: { open: '10:00', close: '21:00' },
      tuesday: { open: '10:00', close: '21:00' },
      wednesday: { open: '10:00', close: '21:00' },
      thursday: { open: '10:00', close: '21:00' },
      friday: { open: '10:00', close: '21:00' },
      saturday: { open: '10:00', close: '22:00' },
      sunday: { open: '11:00', close: '20:00' },
    } as Prisma.InputJsonValue,
    seoTitle: 'Jerzyfy — Football Jerseys',
    seoDescription: 'Shop club, national, kids, and custom football jerseys at Jerzyfy.',
    footerConfig: {
      kicker: 'Match-day identity',
      heading: 'Football jerseys for the stands, the street, and every kick-off.',
      body: 'Jerzyfy is a football jersey store — club kits, national colours, kids sizes, and custom prints.',
      aboutTitle: 'About us',
      aboutBody: 'Welcome to Jerzyfy. Add your story and product collections from the Admin website settings.',
      materialsTitle: 'What we offer',
      materials: [
        'Club and national team-inspired football jerseys.',
        'Youth sizes for young fans.',
        'Custom name and number printing.',
      ],
      showCollections: false,
      collectionsTitle: 'Featured collections',
      shopTitle: 'Shop',
      contactTitle: 'Contact',
      copyright: '',
    } as Prisma.InputJsonValue,
  };

  await prisma.websiteSettings.upsert({
    where: { tenantId: tenant.id },
    update: websitePayload,
    create: {
      tenantId: tenant.id,
      ...websitePayload,
    },
  });

  const customizationDefaults: Array<{
    name: string;
    description: string;
    pricingType: 'FIXED' | 'PER_ITEM' | 'PERCENTAGE';
    price: string;
    sortOrder: number;
  }> = [
    { name: 'Name printing', description: 'Player name on the back', pricingType: 'PER_ITEM', price: '150.00', sortOrder: 1 },
    { name: 'Number printing', description: 'Jersey number on the back', pricingType: 'PER_ITEM', price: '120.00', sortOrder: 2 },
    { name: 'Team logo', description: 'Club or team crest', pricingType: 'FIXED', price: '2500.00', sortOrder: 3 },
    { name: 'Sponsor logo', description: 'Front sponsor print', pricingType: 'FIXED', price: '3500.00', sortOrder: 4 },
    { name: 'Sleeve patch', description: 'Sleeve competition or sponsor patch', pricingType: 'PER_ITEM', price: '80.00', sortOrder: 5 },
    { name: 'Custom design', description: 'Bespoke artwork and layout', pricingType: 'PERCENTAGE', price: '10.00', sortOrder: 6 },
  ];
  for (const option of customizationDefaults) {
    const existing = await prisma.customizationOption.findFirst({
      where: { tenantId: tenant.id, name: option.name },
    });
    if (existing) {
      await prisma.customizationOption.update({
        where: { id: existing.id },
        data: option,
      });
    } else {
      await prisma.customizationOption.create({
        data: { tenantId: tenant.id, ...option, status: 'ACTIVE' },
      });
    }
  }

  for (const name of EXPENSE_CATEGORIES) {
    const slug = slugify(name);
    await prisma.expenseCategory.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { name },
      create: { tenantId: tenant.id, name, slug },
    });
  }

  await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId: tenant.id, documentType: 'SALE_INVOICE' } },
    update: { prefix: 'INV', padLength: 6 },
    create: {
      tenantId: tenant.id,
      documentType: 'SALE_INVOICE',
      prefix: 'INV',
      nextNumber: 1,
      padLength: 6,
    },
  });

  await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId: tenant.id, documentType: 'ORDER' } },
    update: { prefix: 'ORD', padLength: 6 },
    create: {
      tenantId: tenant.id,
      documentType: 'ORDER',
      prefix: 'ORD',
      nextNumber: 1,
      padLength: 6,
    },
  });

  await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId: tenant.id, documentType: 'CUSTOM_ORDER' } },
    update: { prefix: 'CO', padLength: 6 },
    create: {
      tenantId: tenant.id,
      documentType: 'CUSTOM_ORDER',
      prefix: 'CO',
      nextNumber: 1,
      padLength: 6,
    },
  });

  await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId: tenant.id, documentType: 'CUSTOM_ORDER_QUOTE' } },
    update: { prefix: 'QT', padLength: 6 },
    create: {
      tenantId: tenant.id,
      documentType: 'CUSTOM_ORDER_QUOTE',
      prefix: 'QT',
      nextNumber: 1,
      padLength: 6,
    },
  });

  await prisma.documentSequence.upsert({
    where: { tenantId_documentType: { tenantId: tenant.id, documentType: 'PURCHASE_ORDER' } },
    update: { prefix: 'PO', padLength: 6 },
    create: {
      tenantId: tenant.id,
      documentType: 'PURCHASE_ORDER',
      prefix: 'PO',
      nextNumber: 1,
      padLength: 6,
    },
  });

  console.warn('Seed complete. Staff accounts (development password only):');
  for (const code of SEEDED_USER_ROLE_CODES) {
    const staff = PRODUCTION_STAFF[code];
    console.warn(`  ${staff.email}  /  ${SEED_PASSWORD}  (${ROLE_NAMES[code].name})`);
  }
  console.warn(`Tenant slug: ${TENANT_SLUG}`);
  console.warn(`Tenant id: ${tenant.id}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
