/**
 * DEVELOPMENT SEED ONLY.
 *
 * This script loads demo data for local development of the Jersey Commerce Engine.
 * Never use these credentials, hashes, or identities in production.
 *
 * Demo password for every seeded user: DevPassword123!
 */
import { PrismaClient, RoleCode, type Prisma } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/rbac/default-role-permissions';
import { ROLE_CODES, type RoleCode as SharedRoleCode } from '../../../packages/types/src/enums';
import { PERMISSION_CATALOG, type PermissionCode } from '../../../packages/types/src/permissions';
import { reconcileInventoryFromMovements, seedErpDashboard } from './seed-erp-dashboard';

const prisma = new PrismaClient();

const DEMO_TENANT_SLUG = 'demo-jersey-store';
const DEMO_PASSWORD = 'DevPassword123!';
const PLACEHOLDER_IMAGE = (label: string) =>
  `https://placehold.co/800x1000/0f172a/f8fafc.png?text=${encodeURIComponent(label)}`;

const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
const KIDS_SIZES = ['6', '8', '10', '12'] as const;

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

const ROLE_NAMES: Record<SharedRoleCode, { name: string; description: string; email: string; personName: string }> = {
  OWNER: {
    name: 'Owner',
    description: 'Full access to the tenant',
    email: 'owner@demo.local',
    personName: 'Aisha Khan',
  },
  MANAGER: {
    name: 'Manager',
    description: 'Day-to-day store operations except user administration',
    email: 'manager@demo.local',
    personName: 'Rohan Mehta',
  },
  CASHIER: {
    name: 'Cashier',
    description: 'POS sales, customers, and read-only catalog access. Discounts are not granted by default.',
    email: 'cashier@demo.local',
    personName: 'Neha Patel',
  },
  INVENTORY_MANAGER: {
    name: 'Inventory Manager',
    description: 'Catalog, stock, and purchasing',
    email: 'inventory@demo.local',
    personName: 'Vikram Singh',
  },
  WEBSITE_MANAGER: {
    name: 'Website Manager',
    description: 'Storefront catalog presentation and website settings',
    email: 'website@demo.local',
    personName: 'Diya Sharma',
  },
};

const ROLE_PERMISSION_MAP: Record<SharedRoleCode, readonly PermissionCode[] | 'ALL'> = DEFAULT_ROLE_PERMISSIONS;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SIZE_BARCODE: Record<string, string> = {
  S: '01',
  M: '02',
  L: '03',
  XL: '04',
  XXL: '05',
  '6': '16',
  '8': '18',
  '10': '20',
  '12': '22',
};

function barcodeFor(productIndex: number, size: string): string {
  const sizeCode = SIZE_BARCODE[size] ?? '00';
  return `8901${String(productIndex).padStart(4, '0')}${sizeCode}000`.slice(0, 13);
}

async function upsertCustomer(
  tenantId: string,
  data: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    notes: string;
  },
): Promise<{ id: string }> {
  const existing = await prisma.customer.findFirst({
    where: { tenantId, phone: data.phone },
  });

  if (existing) {
    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: { ...data, status: 'ACTIVE' },
    });
    await prisma.customerPreference.upsert({
      where: { customerId: updated.id },
      update: {},
      create: { tenantId, customerId: updated.id },
    });
    return updated;
  }

  return prisma.customer.create({
    data: {
      tenantId,
      ...data,
      status: 'ACTIVE',
      preference: { create: { tenantId } },
    },
  });
}

async function upsertSupplier(
  tenantId: string,
  data: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    taxInformation: string;
    notes: string;
  },
) {
  const existing = await prisma.supplier.findFirst({ where: { tenantId, name: data.name } });
  if (existing) {
    return prisma.supplier.update({
      where: { id: existing.id },
      data: { ...data, status: 'ACTIVE' },
    });
  }
  return prisma.supplier.create({
    data: { tenantId, ...data, status: 'ACTIVE' },
  });
}

async function seedPurchasingDemo(tenantId: string, ownerId: string): Promise<void> {
  const premium = await upsertSupplier(tenantId, {
    name: 'Premium Sports Suppliers',
    contactPerson: 'Meera Iyer',
    phone: '04440001111',
    email: 'orders@premiumsports.example.invalid',
    address: '14 Knit Avenue',
    city: 'Tiruppur',
    state: 'Tamil Nadu',
    postalCode: '641601',
    taxInformation: 'GSTIN: 33PREMI0000A1Z5',
    notes: 'Primary replica jersey supplier.',
  });
  const wholesale = await upsertSupplier(tenantId, {
    name: 'India Sports Wholesale',
    contactPerson: 'Arjun Nair',
    phone: '02240002222',
    email: 'sales@indiasports.example.invalid',
    address: '88 Wholesale Market',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400013',
    taxInformation: 'GSTIN: 27INDIA0000A1Z8',
    notes: 'National team kits and bulk orders.',
  });
  const teamwear = await upsertSupplier(tenantId, {
    name: 'Teamwear Distributors',
    contactPerson: 'Kavita Shah',
    phone: '07940003333',
    email: 'hello@teamwear.example.invalid',
    address: '5 Stadium Lane',
    city: 'Ahmedabad',
    state: 'Gujarat',
    postalCode: '380001',
    taxInformation: 'GSTIN: 24TEAMW0000A1Z2',
    notes: 'Club and custom teamwear.',
  });

  const indiaL = await prisma.productVariant.findFirst({
    where: { tenantId, sku: 'IND-JER-L' },
  });
  const madridL = await prisma.productVariant.findFirst({
    where: { tenantId, sku: 'RMA-JER-L' },
  });
  const clubM = await prisma.productVariant.findFirst({
    where: { tenantId, sku: 'DJS-CLUB-HOME-M' },
  });
  if (!indiaL || !madridL || !clubM) {
    return;
  }

  const receivedPurchase = await ensureDemoPurchase({
    tenantId,
    ownerId,
    supplierId: premium.id,
    purchaseNumber: 'PO-000001',
    status: 'RECEIVED',
    notes: 'India jersey restock',
    items: [
      {
        productVariantId: indiaL.id,
        orderedQuantity: 100,
        receivedQuantity: 100,
        unitCost: '450.00',
        total: '45000.00',
      },
    ],
    subtotal: '45000.00',
    total: '45000.00',
    orderedAt: true,
    receivedAt: true,
  });
  await ensureDemoReceipts(receivedPurchase.id, tenantId, premium.id, ownerId, [
    { productVariantId: indiaL.id, quantities: [60, 40], unitCost: '450.00' },
  ]);
  await ensureDemoPayment({
    tenantId,
    ownerId,
    supplierId: premium.id,
    purchaseId: receivedPurchase.id,
    amount: '20000.00',
    method: 'BANK_TRANSFER',
    reference: 'UTR-PO000001-PARTIAL',
    notes: 'Partial payment against PO-000001',
  });

  const partialPurchase = await ensureDemoPurchase({
    tenantId,
    ownerId,
    supplierId: wholesale.id,
    purchaseNumber: 'PO-000002',
    status: 'PARTIALLY_RECEIVED',
    notes: 'Real Madrid restock in two deliveries',
    items: [
      {
        productVariantId: madridL.id,
        orderedQuantity: 50,
        receivedQuantity: 20,
        unitCost: '400.00',
        total: '20000.00',
      },
    ],
    subtotal: '20000.00',
    total: '20000.00',
    orderedAt: true,
  });
  await ensureDemoReceipts(partialPurchase.id, tenantId, wholesale.id, ownerId, [
    { productVariantId: madridL.id, quantities: [20], unitCost: '400.00' },
  ]);

  await ensureDemoPurchase({
    tenantId,
    ownerId,
    supplierId: teamwear.id,
    purchaseNumber: 'PO-000003',
    status: 'DRAFT',
    notes: 'Draft club jersey order — not yet sent',
    items: [
      {
        productVariantId: clubM.id,
        orderedQuantity: 24,
        receivedQuantity: 0,
        unitCost: '950.00',
        total: '22800.00',
      },
    ],
    subtotal: '22800.00',
    total: '22800.00',
  });
}

async function ensureDemoPurchase(input: {
  tenantId: string;
  ownerId: string;
  supplierId: string;
  purchaseNumber: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  notes: string;
  items: Array<{
    productVariantId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: string;
    total: string;
  }>;
  subtotal: string;
  total: string;
  orderedAt?: boolean;
  receivedAt?: boolean;
}) {
  const existing = await prisma.purchase.findFirst({
    where: { tenantId: input.tenantId, purchaseNumber: input.purchaseNumber },
    include: { items: true },
  });
  if (existing) {
    return existing;
  }
  return prisma.purchase.create({
    data: {
      tenantId: input.tenantId,
      supplierId: input.supplierId,
      purchaseNumber: input.purchaseNumber,
      status: input.status,
      subtotal: input.subtotal,
      discount: 0,
      tax: 0,
      total: input.total,
      notes: input.notes,
      createdById: input.ownerId,
      orderedAt: input.orderedAt ? new Date() : null,
      receivedAt: input.receivedAt ? new Date() : null,
      items: {
        create: input.items.map((item) => ({
          tenantId: input.tenantId,
          productVariantId: item.productVariantId,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          unitCost: item.unitCost,
          discount: 0,
          tax: 0,
          total: item.total,
        })),
      },
    },
    include: { items: true },
  });
}

async function ensureDemoReceipts(
  purchaseId: string,
  tenantId: string,
  supplierId: string,
  ownerId: string,
  lines: Array<{ productVariantId: string; quantities: number[]; unitCost: string }>,
) {
  const existing = await prisma.purchaseReceipt.count({ where: { tenantId, purchaseId } });
  if (existing > 0) {
    return;
  }
  const items = await prisma.purchaseItem.findMany({ where: { tenantId, purchaseId } });
  for (const line of lines) {
    const purchaseItem = items.find((item) => item.productVariantId === line.productVariantId);
    if (!purchaseItem) {
      continue;
    }
    for (const quantity of line.quantities) {
      await prisma.purchaseReceipt.create({
        data: {
          tenantId,
          purchaseId,
          supplierId,
          createdById: ownerId,
          notes: `Seed receipt ${quantity} units`,
          items: {
            create: {
              tenantId,
              purchaseItemId: purchaseItem.id,
              productVariantId: line.productVariantId,
              quantity,
              unitCost: line.unitCost,
            },
          },
        },
      });
      const movementExists = await prisma.inventoryMovement.findFirst({
        where: {
          tenantId,
          productVariantId: line.productVariantId,
          type: 'PURCHASE',
          referenceType: 'PURCHASE',
          referenceId: purchaseId,
          quantity,
        },
      });
      if (!movementExists) {
        await prisma.inventoryMovement.create({
          data: {
            tenantId,
            productVariantId: line.productVariantId,
            quantity,
            type: 'PURCHASE',
            referenceType: 'PURCHASE',
            referenceId: purchaseId,
            reason: 'Development purchase receipt',
            unitCost: line.unitCost,
            createdBy: ownerId,
          },
        });
      }
    }
  }
}

async function ensureDemoPayment(input: {
  tenantId: string;
  ownerId: string;
  supplierId: string;
  purchaseId: string;
  amount: string;
  method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
  reference: string;
  notes: string;
}) {
  const existing = await prisma.supplierPayment.findFirst({
    where: { tenantId: input.tenantId, reference: input.reference },
  });
  if (existing) {
    return existing;
  }
  return prisma.supplierPayment.create({
    data: {
      tenantId: input.tenantId,
      supplierId: input.supplierId,
      purchaseId: input.purchaseId,
      amount: input.amount,
      method: input.method,
      status: 'COMPLETED',
      reference: input.reference,
      notes: input.notes,
      createdById: input.ownerId,
    },
  });
}

async function main(): Promise<void> {
  console.warn('=== DEVELOPMENT SEED ONLY — do not use these credentials in production ===');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

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
    where: { slug: DEMO_TENANT_SLUG },
    update: {
      name: 'Demo Jersey Store',
      legalName: 'Demo Jersey Store LLP',
      status: 'ACTIVE',
      logo: PLACEHOLDER_IMAGE('Demo Jersey Store'),
      favicon: PLACEHOLDER_IMAGE('DJS'),
      primaryColor: '#0f172a',
      secondaryColor: '#f97316',
      accentColor: '#ea580c',
      contactPhone: '+91 98765 00000',
      contactEmail: 'hello@demo.local',
      address: '12 Stadium Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
    create: {
      name: 'Demo Jersey Store',
      legalName: 'Demo Jersey Store LLP',
      slug: DEMO_TENANT_SLUG,
      status: 'ACTIVE',
      logo: PLACEHOLDER_IMAGE('Demo Jersey Store'),
      favicon: PLACEHOLDER_IMAGE('DJS'),
      primaryColor: '#0f172a',
      secondaryColor: '#f97316',
      accentColor: '#ea580c',
      contactPhone: '+91 98765 00000',
      contactEmail: 'hello@demo.local',
      address: '12 Stadium Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400001',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
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

    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: meta.email } },
      update: { name: meta.personName, passwordHash, status: 'ACTIVE' },
      create: {
        tenantId: tenant.id,
        name: meta.personName,
        email: meta.email,
        phone: `+91 90000 0000${ROLE_CODES.indexOf(code) + 1}`,
        passwordHash,
        status: 'ACTIVE',
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

  const categoryTree: Array<{ name: string; parent?: string }> = [
    { name: 'Sportswear' },
    { name: 'Football', parent: 'Sportswear' },
    { name: 'Cricket', parent: 'Sportswear' },
    { name: 'Club Jerseys', parent: 'Football' },
    { name: 'National Jerseys', parent: 'Football' },
    { name: 'IPL', parent: 'Cricket' },
    { name: 'International', parent: 'Cricket' },
    { name: 'Custom Jerseys', parent: 'Sportswear' },
    { name: 'Kids', parent: 'Sportswear' },
  ];

  const categoriesByName = new Map<string, { id: string }>();

  for (const category of categoryTree) {
    const parentId = category.parent ? categoriesByName.get(category.parent)?.id : undefined;
    const slug = slugify(category.name);
    const record = await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { name: category.name, parentId: parentId ?? null, status: 'ACTIVE', image: PLACEHOLDER_IMAGE(category.name) },
      create: {
        tenantId: tenant.id,
        parentId: parentId ?? null,
        name: category.name,
        slug,
        description: `${category.name} category`,
        image: PLACEHOLDER_IMAGE(category.name),
        sortOrder: categoryTree.indexOf(category),
        status: 'ACTIVE',
      },
    });
    categoriesByName.set(category.name, record);
  }

  type SeedProduct = {
    name: string;
    category: string;
    brand: string;
    color: string;
    shortDescription: string;
    sizes: readonly string[];
    costPrice: number;
    sellingPrice: number;
    compareAtPrice: number;
    skuPrefix: string;
  };

  function openingQuantityFor(product: SeedProduct, size: string): number {
    if (product.skuPrefix === 'IND-JER') {
      const map: Record<string, number> = { S: 10, M: 25, L: 40, XL: 20, XXL: 12 };
      return map[size] ?? 12;
    }
    if (product.skuPrefix === 'RMA-JER') {
      const map: Record<string, number> = { S: 8, M: 15, L: 30, XL: 12, XXL: 8 };
      return map[size] ?? 8;
    }
    return size === 'M' || size === 'L' || size === '8' || size === '10' ? 40 : 24;
  }

  function reorderLevelFor(product: SeedProduct, size: string): number {
    if (product.skuPrefix === 'IND-JER' && size === 'L') {
      return 10;
    }
    return 6;
  }

  const products: SeedProduct[] = [
    {
      name: 'Premier Club Home Jersey 2025',
      category: 'Club Jerseys',
      brand: 'Arena Knit',
      color: 'Red',
      shortDescription: 'Home replica jersey with sublimated club crest.',
      sizes: ADULT_SIZES,
      costPrice: 950,
      sellingPrice: 2499,
      compareAtPrice: 2999,
      skuPrefix: 'DJS-CLUB-HOME',
    },
    {
      name: 'Premier Club Away Jersey 2025',
      category: 'Club Jerseys',
      brand: 'Arena Knit',
      color: 'White',
      shortDescription: 'Away replica jersey with breathable mesh panels.',
      sizes: ADULT_SIZES,
      costPrice: 950,
      sellingPrice: 2499,
      compareAtPrice: 2999,
      skuPrefix: 'DJS-CLUB-AWAY',
    },
    {
      name: 'National Team Home Jersey',
      category: 'National Jerseys',
      brand: 'Crest Athletic',
      color: 'Sky Blue',
      shortDescription: 'National team home kit replica for match days.',
      sizes: ADULT_SIZES,
      costPrice: 1100,
      sellingPrice: 2799,
      compareAtPrice: 3299,
      skuPrefix: 'DJS-NAT-HOME',
    },
    {
      name: 'IPL Franchise Home Jersey',
      category: 'IPL',
      brand: 'Pitch Pro',
      color: 'Yellow',
      shortDescription: 'Franchise home replica with season sleeve patch.',
      sizes: ADULT_SIZES,
      costPrice: 870,
      sellingPrice: 2299,
      compareAtPrice: 2699,
      skuPrefix: 'DJS-IPL-HOME',
    },
    {
      name: 'International Cricket Replica Jersey',
      category: 'International',
      brand: 'Pitch Pro',
      color: 'Navy',
      shortDescription: 'ODI-style replica jersey with moisture-wicking fabric.',
      sizes: ADULT_SIZES,
      costPrice: 990,
      sellingPrice: 2599,
      compareAtPrice: 3099,
      skuPrefix: 'DJS-INT-ODI',
    },
    {
      name: 'India Cricket Jersey',
      category: 'International',
      brand: 'Pitch Pro',
      color: 'Blue',
      shortDescription: 'Fan replica cricket jersey inspired by national team colours. Generic kit, not licensed imagery.',
      sizes: ADULT_SIZES,
      costPrice: 450,
      sellingPrice: 899,
      compareAtPrice: 1299,
      skuPrefix: 'IND-JER',
    },
    {
      name: 'Real Madrid Jersey',
      category: 'Club Jerseys',
      brand: 'Arena Knit',
      color: 'White',
      shortDescription: 'Fan replica club jersey inspired by Madrid home colours. Generic kit, not licensed imagery.',
      sizes: ADULT_SIZES,
      costPrice: 400,
      sellingPrice: 1299,
      compareAtPrice: 1599,
      skuPrefix: 'RMA-JER',
    },
    {
      name: 'Kids Training Jersey',
      category: 'Kids',
      brand: 'Little Pitch',
      color: 'Green',
      shortDescription: 'Lightweight training jersey sized for children.',
      sizes: KIDS_SIZES,
      costPrice: 420,
      sellingPrice: 999,
      compareAtPrice: 1299,
      skuPrefix: 'DJS-KIDS-TRN',
    },
    {
      name: 'Custom Fan Jersey',
      category: 'Custom Jerseys',
      brand: 'Studio Knit',
      color: 'Black',
      shortDescription: 'Blank fan jersey ready for name and number printing.',
      sizes: ADULT_SIZES,
      costPrice: 780,
      sellingPrice: 1999,
      compareAtPrice: 2499,
      skuPrefix: 'DJS-CUSTOM-BLK',
    },
  ];

  const owner = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: ROLE_NAMES.OWNER.email },
  });

  for (const [productIndex, product] of products.entries()) {
    const slug = slugify(product.name);
    const categoryId = categoriesByName.get(product.category)?.id;
    const record = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: {
        name: product.name,
        description: product.shortDescription,
        shortDescription: product.shortDescription,
        brand: product.brand,
        categoryId,
        status: 'ACTIVE',
        featured: product.category !== 'Kids',
        seoTitle: product.name,
        seoDescription: product.shortDescription,
      },
      create: {
        tenantId: tenant.id,
        name: product.name,
        slug,
        description: product.shortDescription,
        shortDescription: product.shortDescription,
        brand: product.brand,
        categoryId,
        status: 'ACTIVE',
        featured: product.category !== 'Kids',
        seoTitle: product.name,
        seoDescription: product.shortDescription,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: record.id } });
    await prisma.productImage.create({
      data: {
        tenantId: tenant.id,
        productId: record.id,
        url: PLACEHOLDER_IMAGE(product.name),
        storageKey: `demo/${slug}.png`,
        altText: product.name,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    await prisma.productImage.create({
      data: {
        tenantId: tenant.id,
        productId: record.id,
        url: PLACEHOLDER_IMAGE(`${product.name} back`),
        storageKey: `demo/${slug}-back.png`,
        altText: `${product.name} back view placeholder`,
        sortOrder: 1,
        isPrimary: false,
      },
    });

    for (const size of product.sizes) {
      const sku = `${product.skuPrefix}-${size}`;
      const variant = await prisma.productVariant.upsert({
        where: { tenantId_sku: { tenantId: tenant.id, sku } },
        update: {
          productId: record.id,
          barcode: barcodeFor(productIndex, size),
          size,
          color: product.color,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          compareAtPrice: product.compareAtPrice,
          weight: 0.22,
          status: 'ACTIVE',
        },
        create: {
          tenantId: tenant.id,
          productId: record.id,
          sku,
          barcode: barcodeFor(productIndex, size),
          size,
          color: product.color,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          compareAtPrice: product.compareAtPrice,
          weight: 0.22,
          status: 'ACTIVE',
        },
      });

      const openingQty = openingQuantityFor(product, size);
      const reorderLevel = reorderLevelFor(product, size);

      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { quantity: openingQty, reservedQuantity: 0, availableQuantity: openingQty, reorderLevel },
        create: {
          tenantId: tenant.id,
          productVariantId: variant.id,
          quantity: openingQty,
          reservedQuantity: 0,
          availableQuantity: openingQty,
          reorderLevel,
        },
      });

      const existingOpening = await prisma.inventoryMovement.findFirst({
        where: { tenantId: tenant.id, productVariantId: variant.id, type: 'OPENING_STOCK' },
      });

      if (!existingOpening) {
        await prisma.inventoryMovement.create({
          data: {
            tenantId: tenant.id,
            productVariantId: variant.id,
            quantity: openingQty,
            type: 'OPENING_STOCK',
            referenceType: 'SEED',
            reason: 'Development opening stock',
            unitCost: product.costPrice,
            createdBy: owner.id,
          },
        });
      }
    }
  }

  const websitePayload = {
    logo: tenant.logo,
    favicon: tenant.favicon,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    accentColor: tenant.accentColor,
    backgroundColor: '#ffffff',
    foregroundColor: '#0f172a',
    headingFont: 'Barlow Condensed',
    bodyFont: 'Inter',
    homepageConfig: {
      sections: [
        {
          type: 'hero',
          enabled: true,
          heading: 'Rep Your Team.',
          subheading: 'Premium Jerseys. Built for Fans.',
          ctaLabel: 'Shop Jerseys',
          ctaHref: '/products',
          image: PLACEHOLDER_IMAGE('Rep Your Team'),
        },
        {
          type: 'featured-categories',
          enabled: true,
          heading: 'Shop the pitch',
          categorySlugs: ['football', 'cricket', 'ipl', 'custom-jerseys'],
        },
        {
          type: 'featured-products',
          enabled: true,
          heading: 'Featured kits',
        },
        {
          type: 'promo-banner',
          enabled: true,
          heading: 'Custom names and numbers',
          subheading: 'Build a fan jersey with your name on the back.',
          ctaLabel: 'Shop custom jerseys',
          ctaHref: '/category/custom-jerseys',
        },
        {
          type: 'best-sellers',
          enabled: true,
          heading: 'Best sellers',
        },
        {
          type: 'new-arrivals',
          enabled: true,
          heading: 'New arrivals',
        },
        {
          type: 'trust',
          enabled: true,
          heading: 'Built for match day',
          items: [
            { title: 'Premium Quality', description: 'Durable fabrics and sharp prints that hold up on the pitch.' },
            { title: 'Fast Delivery', description: 'Packed from the store warehouse and sent out quickly.' },
            { title: 'Secure Payments', description: 'Checkout totals are calculated by the commerce engine.' },
            { title: 'Easy Returns', description: 'Contact the store if a kit does not fit as expected.' },
          ],
        },
        {
          type: 'cta',
          enabled: true,
          heading: 'Find your jersey',
          subheading: 'Club, national, IPL, and custom kits in one catalog.',
          ctaLabel: 'Browse all jerseys',
          ctaHref: '/products',
        },
      ],
    } as Prisma.InputJsonValue,
    contactPhone: tenant.contactPhone,
    contactEmail: tenant.contactEmail,
    contactAddress: `${tenant.address}, ${tenant.city}`,
    socialLinks: {
      instagram: 'https://instagram.example.invalid/demojerseystore',
      facebook: 'https://facebook.example.invalid/demojerseystore',
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
    seoTitle: 'Demo Jersey Store',
    seoDescription: 'Development storefront catalog for the Jersey Commerce Engine.',
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

  const rahul = await upsertCustomer(tenant.id, {
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul@example.invalid',
    address: '14 Club Road, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400053',
    notes: 'Development customer — frequent club jersey buyer',
  });
  await prisma.customer.update({
    where: { id: rahul.id },
    data: { passwordHash },
  });
  const ananya = await upsertCustomer(tenant.id, {
    name: 'Ananya Iyer',
    phone: '9988776655',
    email: 'ananya@example.invalid',
    address: '22 Stadium Layout',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    notes: 'Development customer — IPL kits',
  });

  const seedTags = ['Football', 'Cricket', 'IPL', 'VIP'] as const;
  const tagsByName = new Map<string, { id: string }>();
  for (const name of seedTags) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: { name },
      create: { tenantId: tenant.id, name, slug },
    });
    tagsByName.set(name, tag);
  }

  async function assignTag(customerId: string, tagName: (typeof seedTags)[number]) {
    const tag = tagsByName.get(tagName);
    if (!tag) {
      return;
    }
    await prisma.customerTag.upsert({
      where: { customerId_tagId: { customerId, tagId: tag.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        customerId,
        tagId: tag.id,
        createdBy: owner?.id,
      },
    });
  }

  await assignTag(rahul.id, 'Football');
  await assignTag(rahul.id, 'VIP');
  await assignTag(ananya.id, 'Cricket');
  await assignTag(ananya.id, 'IPL');

  if (owner) {
    const existingNote = await prisma.customerNote.findFirst({
      where: { tenantId: tenant.id, customerId: rahul.id },
    });
    if (!existingNote) {
      await prisma.customerNote.create({
        data: {
          tenantId: tenant.id,
          customerId: rahul.id,
          createdBy: owner.id,
          body: 'Usually purchases football jerseys, prefers size L.',
        },
      });
    }
  }

  if (owner) {
    await seedPurchasingDemo(tenant.id, owner.id);
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
      nextNumber: 4,
      padLength: 6,
    },
  });
  await prisma.documentSequence.updateMany({
    where: { tenantId: tenant.id, documentType: 'PURCHASE_ORDER', nextNumber: { lt: 4 } },
    data: { nextNumber: 4 },
  });

  const cashier = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: ROLE_NAMES.CASHIER.email },
  });
  if (owner) {
    await seedErpDashboard(prisma, {
      tenantId: tenant.id,
      ownerId: owner.id,
      cashierId: cashier?.id ?? owner.id,
    });
    await reconcileInventoryFromMovements(prisma, tenant.id);
  }

  console.warn('Seed complete. DEVELOPMENT-ONLY login emails:');
  for (const code of ROLE_CODES) {
    console.warn(`  ${ROLE_NAMES[code].email}  /  ${DEMO_PASSWORD}  (${ROLE_NAMES[code].name})`);
  }
  console.warn(`Tenant slug: ${DEMO_TENANT_SLUG}`);
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
