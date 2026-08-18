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
import { InventoryService } from '../src/inventory/inventory.service';

const PASSWORD = 'OwnerDemo!123';
const STAFF_PASSWORD = 'StaffDemo!123';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Phase 8 suppliers and purchasing', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierToken: string;
  let inventoryToken: string;
  let websiteToken: string;
  let variantA: string;
  let variantB: string;
  let supplierA: string;
  let supplierB: string;
  let purchaseId: string;
  let openingQty = 0;

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
    tenantA = { id: '', slug: `phase8-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase8-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 8 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 8 Tenant B',
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
      .send({
        email: `cashier-a-${suffix}@example.com`,
        password: STAFF_PASSWORD,
        name: 'Cashier A',
        roleCodes: ['CASHIER'],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: `inventory-a-${suffix}@example.com`,
        password: STAFF_PASSWORD,
        name: 'Inventory A',
        roleCodes: ['INVENTORY_MANAGER'],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: `website-a-${suffix}@example.com`,
        password: STAFF_PASSWORD,
        name: 'Website A',
        roleCodes: ['WEBSITE_MANAGER'],
      })
      .expect(201);

    cashierToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: `cashier-a-${suffix}@example.com`, password: STAFF_PASSWORD, tenantSlug: tenantA.slug })
          .expect(200)
      ).body,
    ).accessToken as string;
    inventoryToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `inventory-a-${suffix}@example.com`,
            password: STAFF_PASSWORD,
            tenantSlug: tenantA.slug,
          })
          .expect(200)
      ).body,
    ).accessToken as string;
    websiteToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `website-a-${suffix}@example.com`,
            password: STAFF_PASSWORD,
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
            name: 'Phase 8 Jersey',
            status: 'ACTIVE',
            variants: [
              {
                sku: `P8-JER-L-${suffix}`,
                barcode: `8908${suffix}`.slice(0, 13).padEnd(13, '8'),
                size: 'L',
                colour: 'Blue',
                costPrice: '400.00',
                sellingPrice: '999.00',
              },
              {
                sku: `P8-JER-M-${suffix}`,
                barcode: `8909${suffix}`.slice(0, 13).padEnd(13, '9'),
                size: 'M',
                colour: 'Blue',
                costPrice: '400.00',
                sellingPrice: '999.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { variants: Array<{ id: string }> };
    variantA = product.variants[0].id;
    variantB = product.variants[1].id;
    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set(auth(accessA))
      .send({ productVariantId: variantA, quantity: 10, reason: 'Phase 8 opening stock' })
      .expect(201);
    openingQty = 10;

    const foreignProduct = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/products')
          .set(auth(accessB))
          .send({
            name: 'Tenant B Jersey',
            status: 'ACTIVE',
            variants: [
              {
                sku: `P8-B-${suffix}`,
                barcode: `8910${suffix}`.slice(0, 13).padEnd(13, '1'),
                size: 'L',
                colour: 'Red',
                costPrice: '300.00',
                sellingPrice: '799.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { variants: Array<{ id: string }> };
    const tenantBVariant = foreignProduct.variants[0].id;

    const createdSupplierB = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .set(auth(accessB))
          .send({ name: 'Tenant B Supplier', phone: '02240009999' })
          .expect(201)
      ).body,
    ) as { id: string };
    supplierB = createdSupplierB.id;
    void tenantBVariant;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.withoutTenantScope(async () => {
        await prisma.tenant.deleteMany({ where: { slug: { in: [tenantA.slug, tenantB.slug] } } });
      });
    }
    await app?.close();
  });

  it('creates, searches, updates, and deactivates suppliers', async () => {
    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .set(auth(accessA))
          .send({
            name: 'Premium Sports Suppliers',
            contactPerson: 'Meera Iyer',
            phone: '04440001111',
            email: 'orders@premium.example.invalid',
            city: 'Tiruppur',
            state: 'Tamil Nadu',
            postalCode: '641601',
            taxInformation: 'GSTIN: 33PREMI0000A1Z5',
          })
          .expect(201)
      ).body,
    ) as { id: string; status: string };
    supplierA = created.id;
    expect(created.status).toBe('ACTIVE');

    const listed = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/suppliers?search=Premium&status=ACTIVE')
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(listed.items.some((item) => item.id === supplierA)).toBe(true);

    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/suppliers/${supplierA}`)
          .set(auth(accessA))
          .send({ notes: 'Preferred replica supplier' })
          .expect(200)
      ).body,
    ) as { notes: string };
    expect(updated.notes).toBe('Preferred replica supplier');
  });

  it('isolates suppliers across tenants', async () => {
    await request(app.getHttpServer()).get(`/api/v1/suppliers/${supplierB}`).set(auth(accessA)).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/suppliers/${supplierA}`).set(auth(accessB)).expect(404);
  });

  it('creates a draft purchase without changing inventory', async () => {
    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/purchases')
          .set(auth(inventoryToken))
          .send({
            supplierId: supplierA,
            notes: 'India jersey restock',
            items: [{ productVariantId: variantA, orderedQuantity: 100, unitCost: '450.00' }],
          })
          .expect(201)
      ).body,
    ) as { id: string; purchaseNumber: string; status: string; total: string };
    purchaseId = created.id;
    expect(created.purchaseNumber).toBe('PO-000001');
    expect(created.status).toBe('DRAFT');
    expect(created.total).toBe('45000.00');

    const stock = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };
    expect(stock.quantity).toBe(openingQty);
  });

  it('orders a draft purchase without increasing inventory', async () => {
    const ordered = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/purchases/${purchaseId}/order`)
          .set(auth(inventoryToken))
          .expect(201)
      ).body,
    ) as { status: string };
    expect(ordered.status).toBe('ORDERED');
    const stock = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };
    expect(stock.quantity).toBe(openingQty);
  });

  it('partially receives goods, then receives the remainder', async () => {
    const first = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/purchases/${purchaseId}/receive`)
          .set(auth(inventoryToken))
          .send({ productVariantId: variantA, receivedQuantity: 60, notes: 'First delivery' })
          .expect(201)
      ).body,
    ) as { status: string; receivedQuantity: number; remainingQuantity: number };
    expect(first.status).toBe('PARTIALLY_RECEIVED');
    expect(first.receivedQuantity).toBe(60);
    expect(first.remainingQuantity).toBe(40);

    const afterFirst = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };
    expect(afterFirst.quantity).toBe(openingQty + 60);

    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${purchaseId}/receive`)
      .set(auth(inventoryToken))
      .send({ items: [{ productVariantId: variantA, receivedQuantity: 41 }] })
      .expect(400);

    const second = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/purchases/${purchaseId}/receive`)
          .set(auth(inventoryToken))
          .send({ productVariantId: variantA, receivedQuantity: 40, notes: 'Balance delivery' })
          .expect(201)
      ).body,
    ) as { status: string; receivedQuantity: number };
    expect(second.status).toBe('RECEIVED');
    expect(second.receivedQuantity).toBe(100);

    const afterFull = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };
    expect(afterFull.quantity).toBe(openingQty + 100);

    const movements = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantA}/movements?type=PURCHASE`)
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ type: string; quantity: number; referenceType: string; referenceId: string; unitCost: string }> };
    const purchaseMoves = movements.items.filter((item) => item.referenceId === purchaseId);
    expect(purchaseMoves).toHaveLength(2);
    expect(purchaseMoves.every((item) => item.type === 'PURCHASE' && item.referenceType === 'PURCHASE')).toBe(true);
    expect(purchaseMoves.map((item) => item.quantity).sort()).toEqual([40, 60]);
    expect(purchaseMoves.every((item) => item.unitCost === '450.00')).toBe(true);
  });

  it('records supplier payments and outstanding balances', async () => {
    const partial = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/supplier-payments')
          .set(auth(accessA))
          .send({
            supplierId: supplierA,
            purchaseId,
            amount: '20000.00',
            paymentMethod: 'BANK_TRANSFER',
            reference: 'UTR-TEST-1',
          })
          .expect(201)
      ).body,
    ) as { amount: string; paymentMethod: string };
    expect(partial.amount).toBe('20000.00');
    expect(partial.paymentMethod).toBe('BANK_TRANSFER');

    const detail = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/purchases/${purchaseId}`).set(auth(accessA)).expect(200)).body,
    ) as { amountPaid: string; outstandingAmount: string; total: string };
    expect(detail.total).toBe('45000.00');
    expect(detail.amountPaid).toBe('20000.00');
    expect(detail.outstandingAmount).toBe('25000.00');

    await request(app.getHttpServer())
      .post('/api/v1/supplier-payments')
      .set(auth(accessA))
      .send({
        supplierId: supplierA,
        purchaseId,
        amount: '25000.01',
        paymentMethod: 'CASH',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/supplier-payments')
      .set(auth(accessA))
      .send({
        supplierId: supplierA,
        purchaseId,
        amount: '25000.00',
        paymentMethod: 'UPI',
        reference: 'UPI-TEST-2',
      })
      .expect(201);

    const balance = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/suppliers/${supplierA}/balance`)
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { totalPurchases: string; totalPaid: string; outstandingAmount: string };
    expect(balance.totalPurchases).toBe('45000.00');
    expect(balance.totalPaid).toBe('45000.00');
    expect(balance.outstandingAmount).toBe('0.00');
  });

  it('cancels unordered drafts and rejects cancellation after receiving', async () => {
    const draft = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/purchases')
          .set(auth(accessA))
          .send({
            supplierId: supplierA,
            items: [{ productVariantId: variantB, orderedQuantity: 5, unitCost: '400.00' }],
          })
          .expect(201)
      ).body,
    ) as { id: string };
    const cancelled = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/purchases/${draft.id}/cancel`)
          .set(auth(accessA))
          .send({ reason: 'Supplier delayed indefinitely' })
          .expect(201)
      ).body,
    ) as { status: string; cancelReason: string };
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelReason).toContain('delayed');

    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${purchaseId}/cancel`)
      .set(auth(accessA))
      .send({ reason: 'too late' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/supplier-payments')
      .set(auth(accessA))
      .send({
        supplierId: supplierA,
        purchaseId: draft.id,
        amount: '10.00',
        paymentMethod: 'CASH',
      })
      .expect(409);
  });

  it('enforces RBAC for cashiers and website managers', async () => {
    await request(app.getHttpServer()).get('/api/v1/suppliers').set(auth(cashierToken)).expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${purchaseId}/receive`)
      .set(auth(cashierToken))
      .send({ productVariantId: variantA, receivedQuantity: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/supplier-payments')
      .set(auth(websiteToken))
      .send({
        supplierId: supplierA,
        purchaseId,
        amount: '1.00',
        paymentMethod: 'CASH',
      })
      .expect(403);
  });

  it('rolls back inventory when receiving fails mid-transaction', async () => {
    const extra = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/purchases')
          .set(auth(accessA))
          .send({
            supplierId: supplierA,
            items: [
              { productVariantId: variantA, orderedQuantity: 8, unitCost: '450.00' },
              { productVariantId: variantB, orderedQuantity: 8, unitCost: '450.00' },
            ],
          })
          .expect(201)
      ).body,
    ) as { id: string };
    await request(app.getHttpServer()).post(`/api/v1/purchases/${extra.id}/order`).set(auth(accessA)).expect(201);

    const before = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };

    const inventory = app.get(InventoryService);
    const original = inventory.applyPurchase.bind(inventory);
    jest.spyOn(inventory, 'applyPurchase').mockImplementation(async (tx, input) => {
      if (input.productVariantId === variantB) {
        throw new Error('forced receiving failure');
      }
      return original(tx, input);
    });

    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${extra.id}/receive`)
      .set(auth(accessA))
      .send({
        items: [
          { productVariantId: variantA, receivedQuantity: 8 },
          { productVariantId: variantB, receivedQuantity: 8 },
        ],
      })
      .expect(500);

    (inventory.applyPurchase as jest.Mock).mockRestore();

    const after = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/inventory/${variantA}`).set(auth(accessA)).expect(200)).body,
    ) as { quantity: number };
    expect(after.quantity).toBe(before.quantity);

    const purchase = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/purchases/${extra.id}`).set(auth(accessA)).expect(200)).body,
    ) as { status: string; receivedQuantity: number };
    expect(purchase.status).toBe('ORDERED');
    expect(purchase.receivedQuantity).toBe(0);
  });

  it('returns purchase reports for the current tenant only', async () => {
    const summary = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/reports/purchases-summary').set(auth(accessA)).expect(200))
        .body,
    ) as { count: number; total: string };
    expect(summary.count).toBeGreaterThanOrEqual(1);
    expect(Number(summary.total)).toBeGreaterThan(0);

    await request(app.getHttpServer()).get('/api/v1/reports/supplier-balances').set(auth(inventoryToken)).expect(200);
    await request(app.getHttpServer()).get('/api/v1/reports/top-suppliers').set(auth(accessA)).expect(200);
    await request(app.getHttpServer()).get('/api/v1/reports/purchases-summary').set(auth(cashierToken)).expect(403);
  });
});
