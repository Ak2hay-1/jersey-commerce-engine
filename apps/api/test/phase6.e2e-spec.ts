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

const OWNER_PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';
const WEBSITE_PASSWORD = 'WebsiteDemo!123';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

describe('Phase 6 sales, payments, and receipts', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierToken: string;
  let websiteToken: string;
  let variantId: string;
  let sku: string;
  let sessionId: string;
  let cashSaleId: string;
  let cashSaleItemId: string;
  let invoiceOne: string;
  let splitSaleId: string;
  let rollbackVariantId: string;
  let productId: string;

  const api = () => request(app.getHttpServer());

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ApiSuccessInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    await app.init();

    prisma = app.get(PrismaService);
    const passwords = app.get(PasswordService);
    const rbac = app.get(RbacService);
    suffix = `${Date.now()}`;
    tenantA = { id: '', slug: `phase6-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase6-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(OWNER_PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 6 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 6 Tenant B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantB.id = createdB.tenant.id;
    });

    accessA = unwrap(
      (await api().post('/api/v1/auth/login').send({ email: tenantA.ownerEmail, password: OWNER_PASSWORD, tenantSlug: tenantA.slug }).expect(200)).body,
    ).accessToken as string;
    accessB = unwrap(
      (await api().post('/api/v1/auth/login').send({ email: tenantB.ownerEmail, password: OWNER_PASSWORD, tenantSlug: tenantB.slug }).expect(200)).body,
    ).accessToken as string;

    await api()
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ email: `cashier-a-${suffix}@example.com`, password: CASHIER_PASSWORD, name: 'Cashier A', roleCodes: ['CASHIER'] })
      .expect(201);
    await api()
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ email: `website-a-${suffix}@example.com`, password: WEBSITE_PASSWORD, name: 'Website A', roleCodes: ['WEBSITE_MANAGER'] })
      .expect(201);

    cashierToken = unwrap(
      (
        await api()
          .post('/api/v1/auth/login')
          .send({ email: `cashier-a-${suffix}@example.com`, password: CASHIER_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
    websiteToken = unwrap(
      (
        await api()
          .post('/api/v1/auth/login')
          .send({ email: `website-a-${suffix}@example.com`, password: WEBSITE_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;

    sku = `PHA6-${suffix}-L`;
    const product = unwrap(
      (
        await api()
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${accessA}`)
          .send({
            name: 'Phase 6 Jersey',
            status: 'ACTIVE',
            variants: [
              { sku, size: 'L', colour: 'Blue', costPrice: '400.00', sellingPrice: '850.00' },
              { sku: `PHA6-${suffix}-XL`, size: 'XL', colour: 'Blue', costPrice: '400.00', sellingPrice: '2000.00' },
            ],
          })
          .expect(201)
      ).body,
    ) as { id: string; variants: Array<{ id: string; sku: string }> };
    productId = product.id;
    variantId = product.variants.find((item) => item.sku === sku)!.id;
    rollbackVariantId = product.variants.find((item) => item.sku !== sku)!.id;

    await api()
      .post('/api/v1/inventory/opening-stock')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: variantId, quantity: 20, reason: 'Phase 6 opening' })
      .expect(201);
    await api()
      .post('/api/v1/inventory/opening-stock')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: rollbackVariantId, quantity: 1, reason: 'Rollback stock' })
      .expect(201);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.withoutTenantScope(async () => {
        await prisma.tenant.deleteMany({ where: { slug: { in: [tenantA.slug, tenantB.slug] } } });
      });
    }
    await app?.close();
  });

  it('rejects unauthenticated payment access', async () => {
    await api().get('/api/v1/payments').expect(401);
  });

  it('rejects website managers from POS payment operations', async () => {
    await api().post('/api/v1/pos/sessions/open').set('Authorization', `Bearer ${websiteToken}`).send({ openingCash: '100.00' }).expect(403);
    await api().get('/api/v1/payments').set('Authorization', `Bearer ${websiteToken}`).expect(403);
    await api().get('/api/v1/reports/payment-summary').set('Authorization', `Bearer ${cashierToken}`).expect(403);
  });

  it('opens a cashier session and records a cash sale with change', async () => {
    const session = unwrap(
      (await api().post('/api/v1/pos/sessions/open').set('Authorization', `Bearer ${cashierToken}`).send({ openingCash: '5000.00' }).expect(201)).body,
    ) as { id: string; expectedCash: string };
    sessionId = session.id;
    expect(session.expectedCash).toBe('5000.00');

    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);

    const sale = unwrap(
      (
        await api()
          .post('/api/v1/pos/sales/complete')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ payments: [{ method: 'CASH', amountReceived: '1000.00' }] })
          .expect(201)
      ).body,
    ) as {
      id: string;
      invoiceNumber: string;
      total: string;
      items: Array<{ id: string; productName: string; sku: string; unitPrice: string; quantity: number }>;
      payments: Array<{ method: string; amount: string; amountReceived: string; changeDue: string; status: string }>;
    };
    cashSaleId = sale.id;
    cashSaleItemId = sale.items[0].id;
    invoiceOne = sale.invoiceNumber;
    expect(sale.invoiceNumber).toBe('INV-000001');
    expect(sale.total).toBe('850.00');
    expect(sale.items[0].productName).toBe('Phase 6 Jersey');
    expect(sale.items[0].sku).toBe(sku);
    expect(sale.payments[0]).toMatchObject({
      method: 'CASH',
      amount: '850.00',
      amountReceived: '1000.00',
      changeDue: '150.00',
      status: 'COMPLETED',
    });
  });

  it('rejects invalid and incomplete payments', async () => {
    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'CASH', amountReceived: '100.00' }] })
      .expect(400);
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'UPI', reference: 'NOCONFIRM' }] })
      .expect(400);
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'CASH', amount: '100.00', amountReceived: '100.00' }] })
      .expect(400);
  });

  it('records confirmed UPI and card payments, then rejects a duplicate reference', async () => {
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'UPI', confirmed: true, reference: `UPI-${suffix}` }] })
      .expect(201);

    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'CARD', confirmed: true, reference: `CARD-${suffix}`, metadata: { last4: '4242', cvv: '999' } }] })
      .expect(201);

    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'UPI', confirmed: true, reference: `UPI-${suffix}` }] })
      .expect(409);
  });

  it('never fakes an online gateway capture', async () => {
    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ payments: [{ method: 'ONLINE', confirmed: true, reference: 'GW-1' }] })
      .expect(400);
  });

  it('completes a split payment sale', async () => {
    await api()
      .patch('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({})
      .expect(400);

    const cart = unwrap((await api().get('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).expect(200)).body) as {
      items: Array<{ id: string }>;
    };
    if (cart.items[0]) {
      await api().delete(`/api/v1/pos/cart/items/${cart.items[0].id}`).set('Authorization', `Bearer ${cashierToken}`).expect(200);
    }
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: rollbackVariantId, quantity: 1 })
      .expect(201);
    const sale = unwrap(
      (
        await api()
          .post('/api/v1/pos/sales/complete')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({
            payments: [
              { method: 'CASH', amount: '500.00', amountReceived: '500.00' },
              { method: 'UPI', amount: '1500.00', confirmed: true, reference: `SPLIT-${suffix}` },
            ],
          })
          .expect(201)
      ).body,
    ) as { id: string; invoiceNumber: string; total: string; payments: Array<{ method: string; amount: string }> };
    splitSaleId = sale.id;
    expect(sale.total).toBe('2000.00');
    expect(sale.invoiceNumber).toBe('INV-000004');
    expect(sale.payments.map((payment) => `${payment.method}:${payment.amount}`)).toEqual(['CASH:500.00', 'UPI:1500.00']);
  });

  it('preserves historical sale prices after the catalog changes', async () => {
    await api()
      .patch(`/api/v1/products/${productId}/variants/${variantId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ sellingPrice: '999.00' })
      .expect(200);
    const sale = unwrap((await api().get(`/api/v1/pos/sales/${cashSaleId}`).set('Authorization', `Bearer ${cashierToken}`).expect(200)).body) as {
      items: Array<{ unitPrice: string }>;
    };
    expect(sale.items[0].unitPrice).toBe('850.00');
  });

  it('returns a receipt without requiring a printer', async () => {
    const receipt = unwrap(
      (await api().get(`/api/v1/pos/sales/${cashSaleId}/receipt?format=thermal`).set('Authorization', `Bearer ${cashierToken}`).expect(200)).body,
    ) as { html: string; data: { transaction: { invoiceNumber: string }; totals: { total: string } } };
    expect(receipt.data.transaction.invoiceNumber).toBe(invoiceOne);
    expect(receipt.data.totals.total).toBe('850.00');
    expect(receipt.html).toContain('TOTAL');
    expect(receipt.html).toContain(invoiceOne);
  });

  it('rejects excessive refunds and restores inventory for restocked returns', async () => {
    const before = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    await api()
      .post(`/api/v1/pos/sales/${cashSaleId}/refund`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ reason: 'Too many', items: [{ saleItemId: cashSaleItemId, quantity: 4 }] })
      .expect(400);

    const refunded = unwrap(
      (
        await api()
          .post(`/api/v1/pos/sales/${cashSaleId}/refund`)
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ reason: 'Customer returned the jersey', items: [{ saleItemId: cashSaleItemId, quantity: 1, restock: 'RESTOCK' }] })
          .expect(201)
      ).body,
    ) as { status: string; refunds: Array<{ amount: string }> };
    expect(refunded.status).toBe('REFUNDED');
    const after = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    expect(after.quantity).toBe(before.quantity + 1);
  });

  it('does not increase sellable stock for a damaged return', async () => {
    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    const sale = unwrap(
      (
        await api()
          .post('/api/v1/pos/sales/complete')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ payments: [{ method: 'CASH', amountReceived: '850.00' }] })
          .expect(201)
      ).body,
    ) as { id: string; items: Array<{ id: string }> };
    const before = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    await api()
      .post(`/api/v1/pos/sales/${sale.id}/refund`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        reason: 'Damaged in fitting room',
        items: [{ saleItemId: sale.items[0].id, quantity: 1, restock: 'DAMAGE' }],
      })
      .expect(201);
    const after = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    expect(after.quantity).toBe(before.quantity);
  });

  it('blocks cashiers from cancelling and rolls inventory back when an owner cancels', async () => {
    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    const sale = unwrap(
      (
        await api()
          .post('/api/v1/pos/sales/complete')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ payments: [{ method: 'CASH', amountReceived: '850.00' }] })
          .expect(201)
      ).body,
    ) as { id: string };
    await api()
      .post(`/api/v1/pos/sales/${sale.id}/cancel`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ reason: 'Cashier should not cancel' })
      .expect(403);

    await api().post('/api/v1/pos/sessions/open').set('Authorization', `Bearer ${accessA}`).send({ openingCash: '100.00' }).expect(201);
    const before = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    const cancelled = unwrap(
      (
        await api()
          .post(`/api/v1/pos/sales/${sale.id}/cancel`)
          .set('Authorization', `Bearer ${accessA}`)
          .send({ reason: 'Customer walked away after payment' })
          .expect(201)
      ).body,
    ) as { status: string; invoiceNumber: string };
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.invoiceNumber).not.toBe('');
    const after = unwrap(
      (await api().get(`/api/v1/inventory/${variantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    expect(after.quantity).toBe(before.quantity + 1);
  });

  it('does not reuse invoice numbers after cancellation', async () => {
    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    const sale = unwrap(
      (
        await api()
          .post('/api/v1/pos/sales/complete')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ payments: [{ method: 'CASH', amountReceived: '850.00' }] })
          .expect(201)
      ).body,
    ) as { invoiceNumber: string };
    expect(sale.invoiceNumber.startsWith('INV-')).toBe(true);
    expect(sale.invoiceNumber).not.toBe(invoiceOne);
  });

  it('isolates tenant financial data and lists payments with filters', async () => {
    const payments = unwrap(
      (
        await api()
          .get(`/api/v1/payments?sessionId=${sessionId}&method=CASH`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string; tenantId?: string }> };
    expect(payments.items.length).toBeGreaterThan(0);

    const foreign = payments.items[0];
    await api().get(`/api/v1/payments/${foreign.id}`).set('Authorization', `Bearer ${accessB}`).expect(404);
    await api().get(`/api/v1/pos/sales/${cashSaleId}`).set('Authorization', `Bearer ${accessB}`).expect(404);
  });

  it('produces payment and session reconciliation from persisted ledgers', async () => {
    const payments = unwrap(
      (await api().get('/api/v1/reports/payment-summary').set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { totalSales: string; methods: Array<{ method: string; sales: string; refunds: string }> };
    expect(Number(payments.totalSales)).toBeGreaterThan(0);
    const cash = payments.methods.find((row) => row.method === 'CASH');
    expect(cash).toBeDefined();
    expect(Number(cash!.refunds)).toBeGreaterThan(0);

    const session = unwrap(
      (
        await api()
          .get(`/api/v1/reports/session-summary?sessionId=${sessionId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { openingCash: string; cashSales: string; cashRefunds: string; expectedCash: string };
    expect(session.openingCash).toBe('5000.00');
    expect(session.expectedCash).toBe(
      (5000 + Number(session.cashSales) - Number(session.cashRefunds)).toFixed(2),
    );

    const sales = unwrap(
      (await api().get('/api/v1/reports/sales-summary').set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { count: number; total: string };
    expect(sales.count).toBeGreaterThan(0);
  });

  it('rolls back a failed sale so no payment or inventory residue remains', async () => {
    const before = unwrap(
      (await api().get(`/api/v1/inventory/${rollbackVariantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    expect(before.quantity).toBe(0);

    await api()
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: rollbackVariantId, quantity: 1, reason: 'Temporarily restore for rollback test' })
      .expect(201);

    await api().post('/api/v1/pos/cart').set('Authorization', `Bearer ${cashierToken}`).send({}).expect(201);
    await api()
      .post('/api/v1/pos/cart/items')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: rollbackVariantId, quantity: 1 })
      .expect(201);

    await api()
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: rollbackVariantId, quantity: -1, reason: 'Force a stock shortage during complete' })
      .expect(201);

    const paymentCountBefore = await prisma.withoutTenantScope(async () =>
      prisma.payment.count({ where: { tenantId: tenantA.id } }),
    );
    const saleCountBefore = await prisma.withoutTenantScope(async () =>
      prisma.sale.count({ where: { tenantId: tenantA.id } }),
    );

    await api()
      .post('/api/v1/pos/sales/complete')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        payments: [
          { method: 'CASH', amount: '500.00', amountReceived: '500.00' },
          { method: 'UPI', amount: '1500.00', confirmed: true, reference: `ROLLBACK-${suffix}` },
        ],
      })
      .expect(409);

    const paymentCountAfter = await prisma.withoutTenantScope(async () =>
      prisma.payment.count({ where: { tenantId: tenantA.id } }),
    );
    const saleCountAfter = await prisma.withoutTenantScope(async () =>
      prisma.sale.count({ where: { tenantId: tenantA.id } }),
    );
    expect(paymentCountAfter).toBe(paymentCountBefore);
    expect(saleCountAfter).toBe(saleCountBefore);
    const stock = unwrap(
      (await api().get(`/api/v1/inventory/${rollbackVariantId}`).set('Authorization', `Bearer ${accessA}`).expect(200)).body,
    ) as { quantity: number };
    expect(stock.quantity).toBe(0);
  });

  it('lists POS sales with invoice, status, and amount filters', async () => {
    const listed = unwrap(
      (
        await api()
          .get(`/api/v1/pos/sales?invoiceNumber=${invoiceOne}&status=REFUNDED`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(listed.items.some((item) => item.id === cashSaleId)).toBe(true);
    expect(splitSaleId).toBeTruthy();
  });
});
