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
import { InventoryService } from '../src/inventory/inventory.service';

const PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';
const CASHIER2_PASSWORD = 'CashierTwo!123';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Phase 5 POS engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierToken: string;
  let cashierTwoToken: string;
  let inventoryToken: string;
  let barcode: string;
  let variantId: string;
  let lastUnitVariantId: string;
  let lastUnitBarcode: string;
  let customerId: string;
  let sessionId: string;
  let cartId: string;
  let itemId: string;
  let heldCartId: string;
  let saleId: string;
  let invoiceNumber: string;
  let cashierEmail: string;
  let cashierTwoEmail: string;

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
    tenantA = { id: '', slug: `phase5-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase5-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };
    cashierEmail = `cashier-a-${suffix}@example.com`;
    cashierTwoEmail = `cashier-two-${suffix}@example.com`;
    barcode = `8905${suffix}`.slice(0, 13).padEnd(13, '8');
    lastUnitBarcode = `8906${suffix}`.slice(0, 13).padEnd(13, '9');

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 5 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 5 Tenant B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantB.id = createdB.tenant.id;
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
      .send({ email: cashierEmail, password: CASHIER_PASSWORD, name: 'Cashier A', roleCodes: ['CASHIER'], mustChangePassword: false })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: cashierTwoEmail,
        password: CASHIER2_PASSWORD,
        name: 'Cashier Two',
        roleCodes: ['CASHIER'], mustChangePassword: false,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: `inventory-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Inventory A',
        roleCodes: ['INVENTORY_MANAGER'], mustChangePassword: false,
      })
      .expect(201);

    cashierToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: cashierEmail, password: CASHIER_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
    cashierTwoToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: cashierTwoEmail, password: CASHIER2_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
    inventoryToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `inventory-a-${suffix}@example.com`,
            password: CASHIER_PASSWORD,
            tenantSlug: tenantA.slug,
          })
          .expect(200)
      ).body,
    ).accessToken as string;

    const product = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/products')
          .set(auth(accessA))
          .send({
            name: 'India Jersey',
            status: 'ACTIVE',
            variants: [
              {
                sku: `IND-JER-L-${suffix}`,
                barcode,
                size: 'L',
                colour: 'Blue',
                costPrice: '450.00',
                sellingPrice: '850.00',
              },
              {
                sku: `IND-JER-S-${suffix}`,
                barcode: lastUnitBarcode,
                size: 'S',
                colour: 'Blue',
                costPrice: '450.00',
                sellingPrice: '850.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { variants: Array<{ id: string; size: string | null }> };
    variantId = product.variants.find((item) => item.size === 'L')!.id;
    lastUnitVariantId = product.variants.find((item) => item.size === 'S')!.id;

    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set(auth(accessA))
      .send({ productVariantId: variantId, quantity: 40, reason: 'Phase 5 opening stock L' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set(auth(accessA))
      .send({ productVariantId: lastUnitVariantId, quantity: 1, reason: 'Phase 5 last unit' })
      .expect(201);

    const customers = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/customers').set(auth(accessA)).expect(200)).body,
    ) as { items?: Array<{ id: string }> };
    if (customers.items?.[0]) {
      customerId = customers.items[0].id;
    } else {
      const createdCustomer = await prisma.customer.create({
        data: { tenantId: tenantA.id, name: 'Rahul Sharma', phone: `98${suffix}`.slice(0, 10) },
      });
      customerId = createdCustomer.id;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.withoutTenantScope(async () => {
        await prisma.tenant.deleteMany({ where: { slug: { in: [tenantA.slug, tenantB.slug] } } });
      });
    }
    await app?.close();
  });

  it('refuses POS access for inventory managers', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pos/sessions/open')
      .set(auth(inventoryToken))
      .send({ openingCash: '5000.00' })
      .expect(403);
  });

  it('opens a session, records opening cash, and prevents a duplicate active session', async () => {
    const opened = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sessions/open')
          .set(auth(cashierToken))
          .send({ openingCash: '5000.00' })
          .expect(201)
      ).body,
    ) as { id: string; openingCash: string; expectedCash: string; status: string };
    sessionId = opened.id;
    expect(opened.status).toBe('OPEN');
    expect(opened.openingCash).toBe('5000.00');
    expect(opened.expectedCash).toBe('5000.00');

    await request(app.getHttpServer())
      .post('/api/v1/pos/sessions/open')
      .set(auth(cashierToken))
      .send({ openingCash: '100.00' })
      .expect(409);

    const current = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/pos/sessions/current').set(auth(cashierToken)).expect(200)).body,
    ) as { id: string };
    expect(current.id).toBe(sessionId);
  });

  it('looks up products by name, SKU, and barcode including OUT_OF_STOCK', async () => {
    const byName = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/pos/products')
          .query({ q: 'India' })
          .set(auth(cashierToken))
          .expect(200)
      ).body,
    ) as { items: Array<{ variant: { sku: string }; stockStatus: string; availableQuantity: number }> };
    expect(byName.items.some((item) => item.variant.sku.includes('IND-JER-L'))).toBe(true);

    const scanned = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/pos/products/barcode/${barcode}`).set(auth(cashierToken)).expect(200))
        .body,
    ) as { stockStatus: string; availableQuantity: number; variant: { sellingPrice: string; size: string } };
    expect(scanned.stockStatus).toBe('IN_STOCK');
    expect(scanned.availableQuantity).toBe(40);
    expect(scanned.variant.sellingPrice).toBe('850.00');
    expect(scanned.variant.size).toBe('L');
  });

  it('creates a cart, adds/updates/removes items, and validates catalog rules', async () => {
    const cart = unwrap(
      (await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201)).body,
    ) as { id: string };
    cartId = cart.id;

    const added = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/cart/items')
          .set(auth(cashierToken))
          .send({ productVariantId: variantId, quantity: 2 })
          .expect(201)
      ).body,
    ) as { items: Array<{ id: string; quantity: number; unitPrice: string; lineTotal: string }>; total: string };
    itemId = added.items[0].id;
    expect(added.items[0].quantity).toBe(2);
    expect(added.items[0].unitPrice).toBe('850.00');
    expect(added.total).toBe('1700.00');

    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/pos/cart/items/${itemId}`)
          .set(auth(cashierToken))
          .send({ quantity: 1 })
          .expect(200)
      ).body,
    ) as { items: Array<{ quantity: number }>; total: string };
    expect(updated.items[0].quantity).toBe(1);
    expect(updated.total).toBe('850.00');

    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: 'missing-variant', quantity: 1 })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: lastUnitVariantId, quantity: 5 })
      .expect(409);

    const patchedProduct = await request(app.getHttpServer())
      .patch(`/api/v1/products/${(await prisma.productVariant.findFirst({ where: { id: lastUnitVariantId } }))!.productId}`)
      .set(auth(accessA))
      .send({ status: 'DRAFT' })
      .expect(200);
    expect(unwrap(patchedProduct.body).status).toBe('DRAFT');
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: lastUnitVariantId, quantity: 1 })
      .expect(400);
    await request(app.getHttpServer())
      .patch(
        `/api/v1/products/${(await prisma.productVariant.findFirst({ where: { id: lastUnitVariantId } }))!.productId}`,
      )
      .set(auth(accessA))
      .send({ status: 'ACTIVE' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 1, discountType: 'PERCENTAGE', discountValue: '10' })
      .expect(403);

    const ownerSession = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sessions/open')
          .set(auth(accessA))
          .send({ openingCash: '1.00' })
          .expect(201)
      ).body,
    ) as { id: string };
    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(accessA)).send({}).expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/pos/cart')
      .set(auth(accessA))
      .send({ discountType: 'PERCENTAGE', discountValue: '150' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/pos/sessions/${ownerSession.id}/close`)
      .set(auth(accessA))
      .send({ closingCash: '1.00' })
      .expect(201);

    await request(app.getHttpServer()).delete(`/api/v1/pos/cart/items/${itemId}`).set(auth(cashierToken)).expect(200);
    const readded = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/cart/items')
          .set(auth(cashierToken))
          .send({ productVariantId: variantId, quantity: 1 })
          .expect(201)
      ).body,
    ) as { items: Array<{ id: string }> };
    itemId = readded.items[0].id;
  });

  it('holds and resumes carts without changing inventory', async () => {
    const before = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    const held = unwrap(
      (await request(app.getHttpServer()).post(`/api/v1/pos/carts/${cartId}/hold`).set(auth(cashierToken)).expect(201)).body,
    ) as { id: string; status: string };
    expect(held.status).toBe('HELD');
    heldCartId = held.id;

    const listed = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/pos/carts/held').set(auth(cashierToken)).expect(200)).body,
    ) as { items: Array<{ id: string }> };
    expect(listed.items.some((item) => item.id === heldCartId)).toBe(true);

    const resumed = unwrap(
      (await request(app.getHttpServer()).post(`/api/v1/pos/carts/${heldCartId}/resume`).set(auth(cashierToken)).expect(201))
        .body,
    ) as { id: string; status: string };
    expect(resumed.status).toBe('ACTIVE');
    cartId = resumed.id;
    const after = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    expect(after?.quantity).toBe(before?.quantity);
  });

  it('attaches a customer, completes a cash sale, decreases inventory, and issues an invoice', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/pos/cart/items/${itemId}`)
      .set(auth(cashierToken))
      .send({ quantity: 2 })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/pos/cart')
      .set(auth(cashierToken))
      .send({ customerId })
      .expect(200);

    const sale = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sales/complete')
          .set(auth(cashierToken))
          .send({
            payments: [{ method: 'CASH', amount: '1700.00', amountReceived: '2000.00' }],
          })
          .expect(201)
      ).body,
    ) as {
      id: string;
      invoiceNumber: string;
      total: string;
      customerId: string | null;
      items: Array<{ unitPrice: string; quantity: number }>;
      payments: Array<{ changeDue: string | null; amountReceived: string | null }>;
      status: string;
    };
    saleId = sale.id;
    invoiceNumber = sale.invoiceNumber;
    expect(sale.invoiceNumber).toMatch(/^INV-\d{6}$/);
    expect(sale.total).toBe('1700.00');
    expect(sale.customerId).toBe(customerId);
    expect(sale.items[0].unitPrice).toBe('850.00');
    expect(sale.items[0].quantity).toBe(2);
    expect(sale.payments[0].changeDue).toBe('300.00');
    expect(sale.status).toBe('COMPLETED');

    const stock = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    expect(stock?.quantity).toBe(38);
    const movement = await prisma.inventoryMovement.findFirst({
      where: { productVariantId: variantId, type: 'SALE', referenceId: sale.id },
    });
    expect(movement?.quantity).toBe(-2);

    const session = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/pos/sessions/current').set(auth(cashierToken)).expect(200)).body,
    ) as { expectedCash: string; cashSales: string };
    expect(session.cashSales).toBe('1700.00');
    expect(session.expectedCash).toBe('6700.00');

    const listed = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/pos/sales')
          .query({ invoiceNumber, paymentMethod: 'CASH' })
          .set(auth(cashierToken))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(listed.items.some((item) => item.id === saleId)).toBe(true);
  });

  it('rolls back the entire sale when inventory mutation fails midway', async () => {
    const cart = unwrap(
      (await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201)).body,
    ) as { id: string };
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    const stockBefore = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    const saleCountBefore = await prisma.sale.count({ where: { tenantId: tenantA.id } });
    const paymentCountBefore = await prisma.payment.count({ where: { tenantId: tenantA.id } });
    const inventory = app.get(InventoryService);
    const spy = jest.spyOn(inventory, 'applySale').mockRejectedValueOnce(new Error('forced failure'));
    await request(app.getHttpServer())
      .post('/api/v1/pos/sales/complete')
      .set(auth(cashierToken))
      .send({ payments: [{ method: 'CASH', amountReceived: '1000.00' }] })
      .expect(500);
    spy.mockRestore();
    expect(await prisma.sale.count({ where: { tenantId: tenantA.id } })).toBe(saleCountBefore);
    expect(await prisma.payment.count({ where: { tenantId: tenantA.id } })).toBe(paymentCountBefore);
    const stockAfter = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    expect(stockAfter?.quantity).toBe(stockBefore?.quantity);
    const stillActive = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/pos/cart').set(auth(cashierToken)).expect(200)).body,
    ) as { id: string; status: string };
    expect(stillActive.id).toBe(cart.id);
    expect(stillActive.status).toBe('ACTIVE');
    await request(app.getHttpServer()).delete('/api/v1/pos/cart').set(auth(cashierToken)).expect(200);
  });

  it('allows only one concurrent sale to consume the last unit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pos/sessions/open')
      .set(auth(cashierTwoToken))
      .send({ openingCash: '1000.00' })
      .expect(201);
    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201);
    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierTwoToken)).send({}).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: lastUnitVariantId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierTwoToken))
      .send({ productVariantId: lastUnitVariantId, quantity: 1 })
      .expect(201);

    const results = await Promise.allSettled([
      request(app.getHttpServer())
        .post('/api/v1/pos/sales/complete')
        .set(auth(cashierToken))
        .send({ payments: [{ method: 'CASH', amountReceived: '850.00' }] }),
      request(app.getHttpServer())
        .post('/api/v1/pos/sales/complete')
        .set(auth(cashierTwoToken))
        .send({ payments: [{ method: 'CASH', amountReceived: '850.00' }] }),
    ]);
    const statuses = results.map((result) => (result.status === 'fulfilled' ? result.value.status : 500));
    expect(statuses.sort()).toEqual([201, 409]);
    const stock = await prisma.inventory.findFirst({ where: { productVariantId: lastUnitVariantId } });
    expect(stock?.quantity).toBe(0);
    const saleCount = await prisma.sale.count({
      where: { tenantId: tenantA.id, items: { some: { productVariantId: lastUnitVariantId } } },
    });
    expect(saleCount).toBe(1);
  });

  it('isolates POS sessions, carts, and sales across tenants', async () => {
    await request(app.getHttpServer()).get(`/api/v1/pos/sales/${saleId}`).set(auth(accessB)).expect(404);
    await request(app.getHttpServer()).get('/api/v1/pos/sessions/current').set(auth(accessB)).expect(404);
    await request(app.getHttpServer()).post('/api/v1/pos/sessions/open').set(auth(accessB)).send({ openingCash: '10.00' });
    await request(app.getHttpServer())
      .post(`/api/v1/pos/carts/${cartId}/resume`)
      .set(auth(accessB))
      .expect(404);
  });

  it('blocks cashier cancellation and allows an owner cancel that restocks inventory', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pos/sales/${saleId}/cancel`)
      .set(auth(cashierToken))
      .send({ reason: 'Customer changed mind' })
      .expect(403);

    const cancelled = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/pos/sales/${saleId}/cancel`)
          .set(auth(accessA))
          .send({ reason: 'Wrong size sold' })
          .expect(201)
      ).body,
    ) as { status: string; cancelReason: string };
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('Wrong size sold');
    const stock = await prisma.inventory.findFirst({ where: { productVariantId: variantId } });
    expect(stock?.quantity).toBe(40);
    const original = await prisma.sale.findFirst({ where: { id: saleId } });
    expect(original?.total.toFixed(2)).toBe('1700.00');
  });

  it('closes a session and verifies expected cash from cash sales minus cash refunds', async () => {
    await request(app.getHttpServer()).delete('/api/v1/pos/cart').set(auth(cashierToken));
    const closed = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/pos/sessions/${sessionId}/close`)
          .set(auth(cashierToken))
          .send({ closingCash: '5000.00' })
          .expect(201)
      ).body,
    ) as { status: string; openingCash: string; expectedCash: string; cashSales: string; cashRefunds: string };
    expect(closed.status).toBe('CLOSED');
    const expected = (
      Number(closed.openingCash) +
      Number(closed.cashSales) -
      Number(closed.cashRefunds)
    ).toFixed(2);
    expect(closed.expectedCash).toBe(expected);
  });
});
