import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { provisionTenant } from '../src/tenants/provision-tenant';
import { PasswordService } from '../src/auth/password.service';
import { RbacService } from '../src/rbac/rbac.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ApiSuccessInterceptor } from '../src/common/interceptors/api-success.interceptor';
import { attachRealtimeAdapter } from './attach-realtime-adapter';

const PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Phase 12 ERP dashboard and reports', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierA: string;
  const saleAInvoice = 'INV-P12-A';
  let expenseAId = '';
  let categoryAId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-use-32plus-chars!';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-use-32plus-chars!';
    process.env.JWT_ACCESS_EXPIRATION ??= '15m';
    process.env.JWT_REFRESH_EXPIRATION ??= '7d';
    process.env.AUTH_RATE_LIMIT ??= '1000';
    process.env.AUTH_RATE_WINDOW_SECONDS ??= '60';
    process.env.BOOTSTRAP_SECRET ??= 'bootstrap-test-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    attachRealtimeAdapter(app);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ApiSuccessInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    await app.init();

    prisma = app.get(PrismaService);
    const passwords = app.get(PasswordService);
    const rbac = app.get(RbacService);
    suffix = `${Date.now()}`;
    tenantA = { id: '', slug: `phase12-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase12-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 12 Store A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 12 Store B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantB.id = createdB.tenant.id;

      const productA = await prisma.product.create({
        data: {
          tenantId: tenantA.id,
          name: 'India Jersey',
          slug: `india-jersey-${suffix}`,
          status: 'ACTIVE',
        },
      });
      const variantA = await prisma.productVariant.create({
        data: {
          tenantId: tenantA.id,
          productId: productA.id,
          sku: `IND-P12-${suffix}`,
          size: 'L',
          costPrice: '450.00',
          sellingPrice: '899.00',
          status: 'ACTIVE',
        },
      });
      await prisma.inventory.create({
        data: {
          tenantId: tenantA.id,
          productVariantId: variantA.id,
          quantity: 20,
          reservedQuantity: 2,
          availableQuantity: 18,
          reorderLevel: 10,
        },
      });
      const customerA = await prisma.customer.create({
        data: { tenantId: tenantA.id, name: 'Rahul Sharma', phone: `98${suffix.slice(-8)}`, status: 'ACTIVE' },
      });
      const saleA = await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          invoiceNumber: saleAInvoice,
          customerId: customerA.id,
          cashierId: createdA.owner.id,
          subtotal: '1798.00',
          discount: '0.00',
          tax: '0.00',
          total: '1798.00',
          status: 'COMPLETED',
          items: {
            create: {
              tenantId: tenantA.id,
              productVariantId: variantA.id,
              productName: 'India Jersey',
              sku: variantA.sku,
              size: 'L',
              quantity: 2,
              unitPrice: '899.00',
              costPrice: '450.00',
              total: '1798.00',
            },
          },
        },
      });
      await prisma.payment.create({
        data: {
          tenantId: tenantA.id,
          saleId: saleA.id,
          createdById: createdA.owner.id,
          amount: '1798.00',
          method: 'UPI',
          status: 'COMPLETED',
        },
      });

      const productB = await prisma.product.create({
        data: {
          tenantId: tenantB.id,
          name: 'Secret Jersey',
          slug: `secret-jersey-${suffix}`,
          status: 'ACTIVE',
        },
      });
      const variantB = await prisma.productVariant.create({
        data: {
          tenantId: tenantB.id,
          productId: productB.id,
          sku: `SEC-P12-${suffix}`,
          size: 'M',
          costPrice: '100.00',
          sellingPrice: '50000.00',
          status: 'ACTIVE',
        },
      });
      await prisma.inventory.create({
        data: {
          tenantId: tenantB.id,
          productVariantId: variantB.id,
          quantity: 5,
          reservedQuantity: 0,
          availableQuantity: 5,
          reorderLevel: 1,
        },
      });
      const saleB = await prisma.sale.create({
        data: {
          tenantId: tenantB.id,
          invoiceNumber: 'INV-P12-B',
          cashierId: createdB.owner.id,
          subtotal: '50000.00',
          total: '50000.00',
          status: 'COMPLETED',
          items: {
            create: {
              tenantId: tenantB.id,
              productVariantId: variantB.id,
              productName: 'Secret Jersey',
              sku: variantB.sku,
              quantity: 1,
              unitPrice: '50000.00',
              costPrice: '100.00',
              total: '50000.00',
            },
          },
        },
      });
      await prisma.payment.create({
        data: {
          tenantId: tenantB.id,
          saleId: saleB.id,
          amount: '50000.00',
          method: 'CASH',
          status: 'COMPLETED',
        },
      });
    });

    accessA = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: tenantA.ownerEmail, password: PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
    accessB = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: tenantB.ownerEmail, password: PASSWORD, tenantSlug: tenantB.slug })
          .expect(200)
      ).body,
    ).accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: `cashier-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Cashier A',
        roleCodes: ['CASHIER'], mustChangePassword: false,
      })
      .expect(201);

    cashierA = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: `cashier-a-${suffix}@example.com`, password: CASHIER_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('calculates dashboard revenue, COGS, gross profit, and inventory valuation for the selected period', async () => {
    const summary = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/dashboard/summary?preset=today').set(auth(accessA)).expect(200))
        .body,
    ) as {
      kpis: {
        revenue: string;
        cogs: string;
        grossProfit: string;
        marginPercent: string;
        orders: number;
        inventoryValue: string;
      };
    };
    expect(summary.kpis.revenue).toBe('1798.00');
    expect(summary.kpis.cogs).toBe('900.00');
    expect(summary.kpis.grossProfit).toBe('898.00');
    expect(summary.kpis.marginPercent).toBe('49.94');
    expect(summary.kpis.orders).toBe(1);
    expect(summary.kpis.inventoryValue).toBe('9000.00');

    const yesterday = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/dashboard/summary?preset=yesterday')
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { kpis: { revenue: string; orders: number } };
    expect(yesterday.kpis.revenue).toBe('0.00');
    expect(yesterday.kpis.orders).toBe(0);
  });

  it('never returns tenant B metrics to tenant A', async () => {
    const summary = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/dashboard/summary?preset=last_30_days').set(auth(accessA)).expect(200))
        .body,
    ) as { kpis: { revenue: string } };
    expect(summary.kpis.revenue).toBe('1798.00');

    const sales = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/reports/sales?preset=last_30_days').set(auth(accessA)).expect(200))
        .body,
    ) as { items: Array<{ invoiceNumber: string; revenue: string }> };
    expect(sales.items.map((row) => row.invoiceNumber)).toEqual([saleAInvoice]);
    expect(sales.items[0]?.revenue).toBe('1798.00');
  });

  it('hides financial KPIs from cashiers and returns 403 for unauthorized financial routes', async () => {
    const summary = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/dashboard/summary?preset=today').set(auth(cashierA)).expect(200))
        .body,
    ) as { kpis: { revenue: string | null; grossProfit: string | null; expenses: string | null } };
    expect(summary.kpis.revenue).toBe('1798.00');
    expect(summary.kpis.grossProfit).toBeNull();
    expect(summary.kpis.expenses).toBeNull();

    await request(app.getHttpServer()).get('/api/v1/reports/sales').set(auth(cashierA)).expect(403);
    await request(app.getHttpServer()).get('/api/v1/expenses').set(auth(cashierA)).expect(403);
    await request(app.getHttpServer()).get('/api/v1/reports/sales/export').set(auth(cashierA)).expect(403);
  });

  it('creates, updates, and voids expenses without deleting history', async () => {
    const categories = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/expenses/categories').set(auth(accessA)).expect(200)).body,
    ) as Array<{ id: string; name: string }>;
    const rent = categories.find((item) => item.name === 'Rent');
    expect(rent).toBeDefined();
    categoryAId = rent!.id;

    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/expenses')
          .set(auth(accessA))
          .send({
            categoryId: categoryAId,
            amount: '15000.00',
            paymentMethod: 'BANK_TRANSFER',
            expenseDate: new Date().toISOString().slice(0, 10),
            description: 'Shop rent',
          })
          .expect(201)
      ).body,
    ) as { id: string; amount: string; status: string };
    expenseAId = created.id;
    expect(created.amount).toBe('15000.00');
    expect(created.status).toBe('ACTIVE');

    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/expenses/${expenseAId}`)
          .set(auth(accessA))
          .send({ amount: '15500.00' })
          .expect(200)
      ).body,
    ) as { amount: string };
    expect(updated.amount).toBe('15500.00');

    const voided = unwrap(
      (
        await request(app.getHttpServer())
          .delete(`/api/v1/expenses/${expenseAId}`)
          .set(auth(accessA))
          .send({ reason: 'Entered twice' })
          .expect(200)
      ).body,
    ) as { status: string; voidReason: string };
    expect(voided.status).toBe('VOIDED');
    expect(voided.voidReason).toBe('Entered twice');

    const stillThere = await prisma.withoutTenantScope(() =>
      prisma.expense.findFirst({ where: { id: expenseAId, tenantId: tenantA.id } }),
    );
    expect(stillThere?.status).toBe('VOIDED');

    const report = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/reports/expenses?preset=today').set(auth(accessA)).expect(200))
        .body,
    ) as { totals: { totalExpenses: string } };
    expect(report.totals.totalExpenses).toBe('0.00');
  });

  it('exports CSV using the same tenant and filters and rejects cross-tenant leakage', async () => {
    const csv = await request(app.getHttpServer())
      .get('/api/v1/reports/sales/export?preset=last_30_days')
      .set(auth(accessA))
      .expect(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain(saleAInvoice);
    expect(csv.text).toContain('1798.00');
    expect(csv.text).not.toContain('INV-P12-B');
    expect(csv.text).not.toContain('50000.00');

    const other = await request(app.getHttpServer())
      .get('/api/v1/reports/sales/export?preset=last_30_days')
      .set(auth(accessB))
      .expect(200);
    expect(other.text).toContain('INV-P12-B');
    expect(other.text).not.toContain(saleAInvoice);
  });

  it('reports inventory reserved/available stock and purchase outstanding independently per tenant', async () => {
    const inventory = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/reports/inventory').set(auth(accessA)).expect(200)).body,
    ) as {
      totals: { quantity: number; reservedQuantity: number; availableQuantity: number; costValue: string };
    };
    expect(inventory.totals.quantity).toBe(20);
    expect(inventory.totals.reservedQuantity).toBe(2);
    expect(inventory.totals.availableQuantity).toBe(18);
    expect(inventory.totals.costValue).toBe('9000.00');

    const purchases = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/reports/purchases?preset=last_30_days').set(auth(accessA)).expect(200))
        .body,
    ) as { totals: { purchaseCount: number; outstanding: string } };
    expect(purchases.totals.purchaseCount).toBe(0);
  });
});
