import type { PrismaClient, PaymentMethod } from '../generated/prisma';

interface SeedErpInput {
  tenantId: string;
  ownerId: string;
  cashierId: string;
}

function daysAgo(days: number, hour = 11): Date {
  const date = new Date();
  date.setHours(hour, 15, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function money(qty: number, unit: number): string {
  return (qty * unit).toFixed(2);
}

export async function seedErpDashboard(prisma: PrismaClient, input: SeedErpInput): Promise<void> {
  const { tenantId, ownerId, cashierId } = input;
  const indiaL = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'IND-JER-L' }, include: { product: true } });
  const indiaM = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'IND-JER-M' }, include: { product: true } });
  const madridL = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'RMA-JER-L' }, include: { product: true } });
  const madridM = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'RMA-JER-M' }, include: { product: true } });
  const clubM = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'DJS-CLUB-HOME-M' }, include: { product: true } });
  const kids6 = await prisma.productVariant.findFirst({ where: { tenantId, sku: 'DJS-KIDS-TRN-6' }, include: { product: true } });
  if (!indiaL || !indiaM || !madridL || !madridM || !clubM || !kids6) {
    return;
  }

  const rahul = await prisma.customer.findFirst({ where: { tenantId, phone: '9876543210' } });
  const ananya = await prisma.customer.findFirst({ where: { tenantId, phone: '9988776655' } });
  const karan = await upsertNamedCustomer(prisma, tenantId, {
    name: 'Karan Mehta',
    phone: '9123400111',
    email: 'karan@example.invalid',
    address: '8 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400002',
    notes: 'New walk-in customer this period',
    createdAt: daysAgo(0, 10),
  });
  const priya = await upsertNamedCustomer(prisma, tenantId, {
    name: 'Priya Nair',
    phone: '9123400222',
    email: 'priya@example.invalid',
    address: '19 Lake View',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682001',
    notes: 'Inactive customer for CRM analytics',
    createdAt: daysAgo(140),
  });

  const indiaSales: Array<{ invoice: string; days: number; qty: number; customerId: string | null; method: PaymentMethod }> = [
    { invoice: 'INV-SEED-001', days: 0, qty: 4, customerId: rahul?.id ?? null, method: 'UPI' },
    { invoice: 'INV-SEED-002', days: 1, qty: 6, customerId: karan.id, method: 'CASH' },
    { invoice: 'INV-SEED-003', days: 3, qty: 12, customerId: rahul?.id ?? null, method: 'CARD' },
    { invoice: 'INV-SEED-004', days: 5, qty: 20, customerId: ananya?.id ?? null, method: 'UPI' },
    { invoice: 'INV-SEED-005', days: 8, qty: 25, customerId: rahul?.id ?? null, method: 'ONLINE' },
    { invoice: 'INV-SEED-006', days: 12, qty: 30, customerId: rahul?.id ?? null, method: 'UPI' },
    { invoice: 'INV-SEED-007', days: 18, qty: 35, customerId: ananya?.id ?? null, method: 'CASH' },
  ];

  for (const row of indiaSales) {
    await ensurePosSale(prisma, {
      tenantId,
      cashierId,
      invoiceNumber: row.invoice,
      createdAt: daysAgo(row.days),
      customerId: row.customerId,
      method: row.method,
      variant: indiaL,
      quantity: row.qty,
    });
  }

  await ensurePosSale(prisma, {
    tenantId,
    cashierId,
    invoiceNumber: 'INV-SEED-008',
    createdAt: daysAgo(0, 14),
    customerId: rahul?.id ?? null,
    method: 'CARD',
    variant: madridL,
    quantity: 8,
  });
  await ensurePosSale(prisma, {
    tenantId,
    cashierId,
    invoiceNumber: 'INV-SEED-009',
    createdAt: daysAgo(2),
    customerId: ananya?.id ?? null,
    method: 'UPI',
    variant: madridL,
    quantity: 12,
  });
  await ensurePosSale(prisma, {
    tenantId,
    cashierId,
    invoiceNumber: 'INV-SEED-010',
    createdAt: daysAgo(4),
    customerId: karan.id,
    method: 'CASH',
    variant: clubM,
    quantity: 8,
  });
  await ensurePosSale(prisma, {
    tenantId,
    cashierId,
    invoiceNumber: 'INV-SEED-011',
    createdAt: daysAgo(100),
    customerId: priya.id,
    method: 'CASH',
    variant: indiaM,
    quantity: 1,
  });
  await ensurePosSale(prisma, {
    tenantId,
    cashierId,
    invoiceNumber: 'INV-SEED-VOID',
    createdAt: daysAgo(0, 9),
    customerId: null,
    method: 'CASH',
    variant: indiaM,
    quantity: 1,
    status: 'VOIDED',
  });

  await ensureCompletedOrder(prisma, {
    tenantId,
    ownerId,
    orderNumber: 'ORD-SEED-001',
    source: 'WEBSITE',
    createdAt: daysAgo(0, 13),
    customerId: rahul?.id ?? null,
    variant: indiaM,
    quantity: 2,
    method: 'ONLINE',
  });
  await ensureCompletedOrder(prisma, {
    tenantId,
    ownerId,
    orderNumber: 'ORD-SEED-002',
    source: 'WHATSAPP',
    createdAt: daysAgo(1, 16),
    customerId: ananya?.id ?? null,
    variant: madridM,
    quantity: 1,
    method: 'UPI',
  });
  await ensureCompletedOrder(prisma, {
    tenantId,
    ownerId,
    orderNumber: 'ORD-SEED-003',
    source: 'MANUAL',
    createdAt: daysAgo(6),
    customerId: karan.id,
    variant: clubM,
    quantity: 1,
    method: 'CASH',
  });

  if (kids6) {
    const existingDamage = await prisma.inventoryMovement.findFirst({
      where: { tenantId, productVariantId: kids6.id, type: 'DAMAGE', referenceId: 'SEED-OOS-KIDS-6' },
    });
    if (!existingDamage) {
      await prisma.inventoryMovement.create({
        data: {
          tenantId,
          productVariantId: kids6.id,
          quantity: -24,
          type: 'DAMAGE',
          referenceType: 'SEED',
          referenceId: 'SEED-OOS-KIDS-6',
          reason: 'Development: mark kids size 6 unavailable for dashboard alerts',
          unitCost: kids6.costPrice,
          createdBy: ownerId,
        },
      });
    }
  }

  await seedExpenses(prisma, tenantId, ownerId);
  if (ananya) {
    await seedCustomOrders(prisma, tenantId, ownerId, ananya.id);
  }
}

async function upsertNamedCustomer(
  prisma: PrismaClient,
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
    createdAt: Date;
  },
) {
  const existing = await prisma.customer.findFirst({ where: { tenantId, phone: data.phone } });
  if (existing) {
    return existing;
  }
  return prisma.customer.create({
    data: {
      tenantId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      notes: data.notes,
      status: 'ACTIVE',
      createdAt: data.createdAt,
      preference: { create: { tenantId } },
    },
  });
}

async function ensurePosSale(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    cashierId: string;
    invoiceNumber: string;
    createdAt: Date;
    customerId: string | null;
    method: PaymentMethod;
    variant: {
      id: string;
      sku: string;
      size: string | null;
      color: string | null;
      costPrice: { toFixed(digits: number): string };
      sellingPrice: { toFixed(digits: number): string };
      product: { name: string };
    };
    quantity: number;
    status?: 'COMPLETED' | 'VOIDED';
  },
): Promise<void> {
  const existing = await prisma.sale.findFirst({
    where: { tenantId: input.tenantId, invoiceNumber: input.invoiceNumber },
  });
  if (existing) {
    return;
  }
  const unit = Number(input.variant.sellingPrice.toFixed(2));
  const cost = Number(input.variant.costPrice.toFixed(2));
  const total = money(input.quantity, unit);
  const sale = await prisma.sale.create({
    data: {
      tenantId: input.tenantId,
      invoiceNumber: input.invoiceNumber,
      customerId: input.customerId,
      cashierId: input.cashierId,
      subtotal: total,
      discount: 0,
      tax: 0,
      total,
      status: input.status ?? 'COMPLETED',
      notes: 'Development seed sale',
      createdAt: input.createdAt,
      items: {
        create: {
          tenantId: input.tenantId,
          productVariantId: input.variant.id,
          productName: input.variant.product.name,
          sku: input.variant.sku,
          size: input.variant.size,
          color: input.variant.color,
          quantity: input.quantity,
          unitPrice: unit.toFixed(2),
          costPrice: cost.toFixed(2),
          total,
        },
      },
    },
  });
  if ((input.status ?? 'COMPLETED') !== 'VOIDED') {
    await prisma.payment.create({
      data: {
        tenantId: input.tenantId,
        saleId: sale.id,
        createdById: input.cashierId,
        amount: total,
        method: input.method,
        status: 'COMPLETED',
        createdAt: input.createdAt,
      },
    });
    await prisma.inventoryMovement.create({
      data: {
        tenantId: input.tenantId,
        productVariantId: input.variant.id,
        quantity: -input.quantity,
        type: 'SALE',
        referenceType: 'SALE',
        referenceId: sale.id,
        reason: 'Development seed sale',
        unitCost: cost.toFixed(2),
        createdBy: input.cashierId,
        createdAt: input.createdAt,
      },
    });
  }
}

async function ensureCompletedOrder(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    ownerId: string;
    orderNumber: string;
    source: 'WEBSITE' | 'WHATSAPP' | 'MANUAL';
    createdAt: Date;
    customerId: string | null;
    variant: {
      id: string;
      sku: string;
      size: string | null;
      color: string | null;
      costPrice: { toFixed(digits: number): string };
      sellingPrice: { toFixed(digits: number): string };
      product: { name: string };
    };
    quantity: number;
    method: PaymentMethod;
  },
): Promise<void> {
  const existing = await prisma.order.findFirst({
    where: { tenantId: input.tenantId, orderNumber: input.orderNumber },
  });
  if (existing) {
    return;
  }
  const unit = Number(input.variant.sellingPrice.toFixed(2));
  const cost = Number(input.variant.costPrice.toFixed(2));
  const total = money(input.quantity, unit);
  const order = await prisma.order.create({
    data: {
      tenantId: input.tenantId,
      orderNumber: input.orderNumber,
      customerId: input.customerId,
      createdById: input.ownerId,
      source: input.source,
      status: 'COMPLETED',
      paymentStatus: 'COMPLETED',
      fulfillmentMethod: input.source === 'WEBSITE' ? 'DELIVERY' : 'STORE_PICKUP',
      inventoryState: 'CONSUMED',
      subtotal: total,
      total,
      currency: 'INR',
      notes: 'Development seed order',
      createdAt: input.createdAt,
      confirmedAt: input.createdAt,
      completedAt: input.createdAt,
      items: {
        create: {
          tenantId: input.tenantId,
          productVariantId: input.variant.id,
          productNameSnapshot: input.variant.product.name,
          skuSnapshot: input.variant.sku,
          sizeSnapshot: input.variant.size,
          colorSnapshot: input.variant.color,
          quantity: input.quantity,
          unitPrice: unit.toFixed(2),
          costPrice: cost.toFixed(2),
          total,
        },
      },
    },
  });
  await prisma.payment.create({
    data: {
      tenantId: input.tenantId,
      orderId: order.id,
      createdById: input.ownerId,
      amount: total,
      method: input.method,
      status: 'COMPLETED',
      createdAt: input.createdAt,
    },
  });
  await prisma.inventoryMovement.create({
    data: {
      tenantId: input.tenantId,
      productVariantId: input.variant.id,
      quantity: -input.quantity,
      type: 'ONLINE_ORDER',
      referenceType: 'ORDER',
      referenceId: order.id,
      reason: 'Development seed ecommerce/manual order',
      unitCost: cost.toFixed(2),
      createdBy: input.ownerId,
      createdAt: input.createdAt,
    },
  });
}

async function seedExpenses(prisma: PrismaClient, tenantId: string, ownerId: string): Promise<void> {
  const categories = await prisma.expenseCategory.findMany({ where: { tenantId } });
  const byName = new Map(categories.map((item) => [item.name, item.id]));
  const rows: Array<{ name: string; amount: string; days: number; method: PaymentMethod; description: string; voided?: boolean }> = [
    { name: 'Rent', amount: '15000.00', days: 5, method: 'BANK_TRANSFER', description: 'Seed: Shop rent' },
    { name: 'Marketing', amount: '8000.00', days: 3, method: 'UPI', description: 'Seed: Match-day ads' },
    { name: 'Electricity', amount: '3000.00', days: 2, method: 'UPI', description: 'Seed: Electricity bill' },
    { name: 'Transport', amount: '2500.00', days: 1, method: 'CASH', description: 'Seed: Courier and local transport' },
    { name: 'Packaging', amount: '1200.00', days: 0, method: 'CASH', description: 'Seed: Mailer bags' },
    { name: 'Salary', amount: '18000.00', days: 8, method: 'BANK_TRANSFER', description: 'Seed: Floor staff salary' },
    { name: 'Rent', amount: '15000.00', days: 6, method: 'BANK_TRANSFER', description: 'Seed: Duplicate rent (voided)', voided: true },
  ];
  for (const row of rows) {
    const categoryId = byName.get(row.name);
    if (!categoryId) {
      continue;
    }
    const existing = await prisma.expense.findFirst({
      where: { tenantId, description: row.description },
    });
    if (existing) {
      continue;
    }
    await prisma.expense.create({
      data: {
        tenantId,
        categoryId,
        amount: row.amount,
        description: row.description,
        paymentMethod: row.method,
        expenseDate: daysAgo(row.days, 8),
        createdBy: ownerId,
        status: row.voided ? 'VOIDED' : 'ACTIVE',
        voidedAt: row.voided ? daysAgo(row.days, 9) : null,
        voidedById: row.voided ? ownerId : null,
        voidReason: row.voided ? 'Duplicate entry — retained for audit' : null,
      },
    });
  }
}

async function seedCustomOrders(
  prisma: PrismaClient,
  tenantId: string,
  ownerId: string,
  customerId: string,
): Promise<void> {
  await ensureCustomOrder(prisma, {
    tenantId,
    ownerId,
    customerId,
    orderNumber: 'CO-SEED-001',
    publicId: 'seed-enquiry-college-kit',
    status: 'INQUIRY',
    type: 'COLLEGE_ORDER',
    createdAt: daysAgo(2),
    teamName: 'Demo College XI',
    estimatedQuantity: 18,
    total: '0.00',
    balanceDue: '0.00',
  });
  const quoted = await ensureCustomOrder(prisma, {
    tenantId,
    ownerId,
    customerId,
    orderNumber: 'CO-SEED-002',
    publicId: 'seed-quote-club-bulk',
    status: 'QUOTE_SENT',
    type: 'BULK_ORDER',
    createdAt: daysAgo(4),
    teamName: 'Harbour FC',
    estimatedQuantity: 25,
    total: '62500.00',
    depositRequired: '20000.00',
    balanceDue: '62500.00',
  });
  await ensureQuote(prisma, quoted.id, tenantId, ownerId, 'QT-SEED-002', '62500.00', 25);
  const production = await ensureCustomOrder(prisma, {
    tenantId,
    ownerId,
    customerId,
    orderNumber: 'CO-SEED-003',
    publicId: 'seed-production-corporate',
    status: 'PRODUCTION',
    type: 'CORPORATE_ORDER',
    createdAt: daysAgo(10),
    teamName: 'Apex Logistics',
    estimatedQuantity: 40,
    total: '98000.00',
    depositRequired: '30000.00',
    depositPaid: '30000.00',
    balanceDue: '68000.00',
    productionStatus: 'PRODUCTION',
    paymentStatus: 'PARTIALLY_PAID',
  });
  await ensureQuote(prisma, production.id, tenantId, ownerId, 'QT-SEED-003', '98000.00', 40, true);
  const completed = await ensureCustomOrder(prisma, {
    tenantId,
    ownerId,
    customerId,
    orderNumber: 'CO-SEED-004',
    publicId: 'seed-completed-tournament',
    status: 'COMPLETED',
    type: 'TOURNAMENT_ORDER',
    createdAt: daysAgo(20),
    teamName: 'Monsoon Cup',
    estimatedQuantity: 16,
    total: '38400.00',
    depositRequired: '12000.00',
    depositPaid: '38400.00',
    balanceDue: '0.00',
    productionStatus: 'READY',
    paymentStatus: 'PAID',
  });
  await ensureQuote(prisma, completed.id, tenantId, ownerId, 'QT-SEED-004', '38400.00', 16, true);
}

async function ensureCustomOrder(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    ownerId: string;
    customerId: string;
    orderNumber: string;
    publicId: string;
    status: 'INQUIRY' | 'QUOTE_SENT' | 'PRODUCTION' | 'COMPLETED';
    type: 'COLLEGE_ORDER' | 'BULK_ORDER' | 'CORPORATE_ORDER' | 'TOURNAMENT_ORDER';
    createdAt: Date;
    teamName: string;
    estimatedQuantity: number;
    total: string;
    depositRequired?: string;
    depositPaid?: string;
    balanceDue: string;
    productionStatus?: 'PRODUCTION' | 'READY';
    paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  },
) {
  const existing = await prisma.customOrder.findFirst({
    where: { tenantId: input.tenantId, orderNumber: input.orderNumber },
  });
  if (existing) {
    return existing;
  }
  return prisma.customOrder.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      createdById: input.ownerId,
      orderNumber: input.orderNumber,
      publicId: input.publicId,
      status: input.status,
      type: input.type,
      teamName: input.teamName,
      estimatedQuantity: input.estimatedQuantity,
      description: 'Development custom order',
      total: input.total,
      depositRequired: input.depositRequired ?? '0.00',
      depositPaid: input.depositPaid ?? '0.00',
      balanceDue: input.balanceDue,
      productionStatus: input.productionStatus,
      paymentStatus: input.paymentStatus ?? 'UNPAID',
      createdAt: input.createdAt,
    },
  });
}

async function ensureQuote(
  prisma: PrismaClient,
  customOrderId: string,
  tenantId: string,
  ownerId: string,
  quoteNumber: string,
  total: string,
  quantity: number,
  accepted = false,
): Promise<void> {
  const existing = await prisma.customOrderQuote.findFirst({
    where: { tenantId, quoteNumber },
  });
  if (existing) {
    return;
  }
  const quote = await prisma.customOrderQuote.create({
    data: {
      tenantId,
      customOrderId,
      quoteNumber,
      version: 1,
      isCurrent: true,
      unitPrice: (Number(total) / quantity).toFixed(2),
      quantity,
      subtotal: total,
      total,
      depositRequired: accepted ? (Number(total) * 0.3).toFixed(2) : '0.00',
      acceptanceState: accepted ? 'ACCEPTED' : 'PENDING',
      acceptedAt: accepted ? daysAgo(9) : null,
      createdById: ownerId,
    },
  });
  if (accepted) {
    await prisma.customOrder.update({
      where: { id: customOrderId },
      data: { acceptedQuoteId: quote.id },
    });
  }
}

export async function reconcileInventoryFromMovements(prisma: PrismaClient, tenantId: string): Promise<void> {
  const grouped = await prisma.inventoryMovement.groupBy({
    by: ['productVariantId'],
    where: { tenantId },
    _sum: { quantity: true },
  });
  for (const row of grouped) {
    const quantity = row._sum.quantity ?? 0;
    const inventory = await prisma.inventory.findFirst({
      where: { tenantId, productVariantId: row.productVariantId },
    });
    if (!inventory) {
      continue;
    }
    await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity,
        availableQuantity: quantity - inventory.reservedQuantity,
      },
    });
  }
}
