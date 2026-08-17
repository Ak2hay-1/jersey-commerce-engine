import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { provisionTenant } from '../src/tenants/provision-tenant';
import { PasswordService } from '../src/auth/password.service';
import { RbacService } from '../src/rbac/rbac.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ApiSuccessInterceptor } from '../src/common/interceptors/api-success.interceptor';
import { runWithContext } from '../src/common/context/request-context';
import { InventoryMovementType } from '../src/prisma/client';

const PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';
const WEBSITE_PASSWORD = 'WebsiteDemo!123';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

describe('Phase 4 inventory engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let inventory: InventoryService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierToken: string;
  let websiteToken: string;
  let ownerUserId: string;
  let variantId: string;
  let sku: string;
  let barcode: string;
  let secondVariantId: string;

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
    inventory = app.get(InventoryService);
    const passwords = app.get(PasswordService);
    const rbac = app.get(RbacService);
    suffix = `${Date.now()}`;
    tenantA = { id: '', slug: `phase4-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase4-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 4 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 4 Tenant B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantB.id = createdB.tenant.id;
      ownerUserId = createdA.owner.id;
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
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        email: `cashier-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Cashier A',
        roleCodes: ['CASHIER'],
      })
      .expect(201);
    cashierToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `cashier-a-${suffix}@example.com`,
            password: CASHIER_PASSWORD,
            tenantSlug: tenantA.slug,
          })
          .expect(200)
      ).body,
    ).accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        email: `website-a-${suffix}@example.com`,
        password: WEBSITE_PASSWORD,
        name: 'Website A',
        roleCodes: ['WEBSITE_MANAGER'],
      })
      .expect(201);
    websiteToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `website-a-${suffix}@example.com`,
            password: WEBSITE_PASSWORD,
            tenantSlug: tenantA.slug,
          })
          .expect(200)
      ).body,
    ).accessToken as string;

    sku = `IND-L-${suffix}`.slice(0, 20);
    barcode = `890${suffix}`.slice(0, 13).padEnd(13, '1');
    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${accessA}`)
          .send({
            name: 'India Jersey',
            status: 'ACTIVE',
            variants: [
              {
                sku,
                barcode,
                size: 'L',
                colour: 'Blue',
                costPrice: '400.00',
                sellingPrice: '899.00',
              },
              {
                sku: `IND-M-${suffix}`.slice(0, 20),
                size: 'M',
                colour: 'Blue',
                costPrice: '400.00',
                sellingPrice: '899.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { variants: Array<{ id: string; size: string | null }> };
    variantId = created.variants.find((item) => item.size === 'L')!.id;
    secondVariantId = created.variants.find((item) => item.size === 'M')!.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('records opening stock with a ledger movement', async () => {
    const opened = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/inventory/opening-stock')
          .set('Authorization', `Bearer ${accessA}`)
          .send({ productVariantId: variantId, quantity: 50, reason: 'Initial count', reorderLevel: 10 })
          .expect(201)
      ).body,
    ) as {
      inventory: { quantity: number; reservedQuantity: number; availableQuantity: number; stockStatus: string };
      movement: { type: string; quantity: number } | null;
    };
    expect(opened.inventory.quantity).toBe(50);
    expect(opened.inventory.reservedQuantity).toBe(0);
    expect(opened.inventory.availableQuantity).toBe(50);
    expect(opened.movement?.type).toBe('OPENING_STOCK');
    expect(opened.movement?.quantity).toBe(50);

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: variantId, quantity: 10, reason: 'Second opening' });
    expect(duplicate.status).toBe(409);
  });

  it('adjusts stock, damages stock, and writes one movement per change', async () => {
    const adjusted = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/inventory/adjust')
          .set('Authorization', `Bearer ${accessA}`)
          .send({ productVariantId: variantId, quantity: 10, reason: 'Physical stock correction' })
          .expect(201)
      ).body,
    ) as { inventory: { quantity: number }; movement: { type: string; quantity: number } };
    expect(adjusted.inventory.quantity).toBe(60);
    expect(adjusted.movement.type).toBe('ADJUSTMENT');
    expect(adjusted.movement.quantity).toBe(10);

    const damaged = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/inventory/adjust')
          .set('Authorization', `Bearer ${accessA}`)
          .send({
            productVariantId: variantId,
            quantity: -5,
            type: 'DAMAGE',
            reason: 'Water damage',
          })
          .expect(201)
      ).body,
    ) as { inventory: { quantity: number }; movement: { type: string; quantity: number } };
    expect(damaged.inventory.quantity).toBe(55);
    expect(damaged.movement.type).toBe('DAMAGE');
    expect(damaged.movement.quantity).toBe(-5);

    const history = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantId}/movements`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { items: Array<{ type: string; quantity: number }>; meta: { totalItems: number } };
    expect(history.meta.totalItems).toBe(3);
    expect(history.items).toHaveLength(3);
  });

  it('rejects missing reasons, zero adjustments, and overselling', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: variantId, quantity: 0, reason: 'noop' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: 'missing-variant', quantity: 1, reason: 'bad variant' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: variantId, quantity: -999, reason: 'oversell' })
      .expect(409);
  });

  it('reserves and releases stock without changing on-hand quantity', async () => {
    const reserved = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/inventory/${variantId}/reserve`)
          .set('Authorization', `Bearer ${accessA}`)
          .send({ quantity: 2, reason: 'Hold for website order', referenceType: 'ORDER', referenceId: 'ORD-1' })
          .expect(201)
      ).body,
    ) as { inventory: { quantity: number; reservedQuantity: number; availableQuantity: number }; movement: unknown };
    expect(reserved.inventory.quantity).toBe(55);
    expect(reserved.inventory.reservedQuantity).toBe(2);
    expect(reserved.inventory.availableQuantity).toBe(53);
    expect(reserved.movement).toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/inventory/${variantId}/reserve`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ quantity: 999, reason: 'Too much' })
      .expect(409);

    const released = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/inventory/${variantId}/release`)
          .set('Authorization', `Bearer ${accessA}`)
          .send({ quantity: 2, reason: 'Order cancelled', referenceType: 'ORDER', referenceId: 'ORD-1' })
          .expect(201)
      ).body,
    ) as { inventory: { quantity: number; reservedQuantity: number; availableQuantity: number } };
    expect(released.inventory.quantity).toBe(55);
    expect(released.inventory.reservedQuantity).toBe(0);
    expect(released.inventory.availableQuantity).toBe(55);
  });

  it('prevents concurrent reservation from overselling the last unit', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ productVariantId: secondVariantId, quantity: 1, reason: 'Single unit for concurrency' })
      .expect(201);

    const results = await Promise.allSettled([
      request(app.getHttpServer())
        .post(`/api/v1/inventory/${secondVariantId}/reserve`)
        .set('Authorization', `Bearer ${accessA}`)
        .send({ quantity: 1, reason: 'POS hold' }),
      request(app.getHttpServer())
        .post(`/api/v1/inventory/${secondVariantId}/reserve`)
        .set('Authorization', `Bearer ${accessA}`)
        .send({ quantity: 1, reason: 'Website hold' }),
    ]);
    const statuses = results.map((result) =>
      result.status === 'fulfilled' ? result.value.status : 500,
    );
    expect(statuses.sort()).toEqual([201, 409]);

    const current = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${secondVariantId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { reservedQuantity: number; availableQuantity: number; quantity: number };
    expect(current.quantity).toBe(1);
    expect(current.reservedQuantity).toBe(1);
    expect(current.availableQuantity).toBe(0);
  });

  it('rolls inventory back when a wrapping transaction fails', async () => {
    const before = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { quantity: number };

    await runWithContext({ tenantId: tenantA.id, userId: ownerUserId, bypassTenantScope: false }, async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          await inventory.increaseStock(
            {
              tenantId: tenantA.id,
              productVariantId: variantId,
              quantity: 7,
              type: InventoryMovementType.PURCHASE,
              reason: 'Should roll back',
              createdBy: ownerUserId,
            },
            tx,
          );
          throw new Error('forced-rollback');
        }),
      ).rejects.toThrow('forced-rollback');
    });

    const after = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { quantity: number };
    expect(after.quantity).toBe(before.quantity);
  });

  it('isolates inventory between tenants and enforces permissions', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/inventory/${variantId}`)
      .set('Authorization', `Bearer ${accessB}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/inventory/barcode/${barcode}`)
      .set('Authorization', `Bearer ${accessB}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/inventory/${variantId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ productVariantId: variantId, quantity: 1, reason: 'cashier cannot adjust' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${websiteToken}`)
      .send({ productVariantId: variantId, quantity: 1, reason: 'website cannot adjust' })
      .expect(403);
  });

  it('looks up barcode/SKU, flags low stock, and values inventory at cost', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/inventory/${variantId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ reorderLevel: 100 })
      .expect(200);

    const listed = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/inventory')
          .query({ lowStock: true, search: 'India' })
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { items: Array<{ productVariantId: string; stockStatus: string }> };
    expect(listed.items.some((item) => item.productVariantId === variantId && item.stockStatus === 'LOW_STOCK')).toBe(
      true,
    );

    const barcodeHit = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/barcode/${barcode}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { sku: string; costPrice: string; sellingPrice: string; status: string };
    expect(barcodeHit.sku).toBe(sku);
    expect(barcodeHit.costPrice).toBe('400.00');
    expect(barcodeHit.sellingPrice).toBe('899.00');
    expect(barcodeHit.status).toBe('LOW_STOCK');

    const skuHit = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/sku/${sku}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { barcode: string | null };
    expect(skuHit.barcode).toBe(barcode);

    const summary = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/inventory/summary')
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as {
      totalVariants: number;
      totalUnits: number;
      inventoryValue: string;
      lowStockVariants: number;
    };
    expect(summary.totalVariants).toBeGreaterThanOrEqual(2);
    expect(summary.totalUnits).toBeGreaterThanOrEqual(56);
    expect(Number(summary.inventoryValue)).toBeGreaterThan(0);
    expect(summary.lowStockVariants).toBeGreaterThanOrEqual(1);
  });

  it('increaseStock and decreaseStock each write exactly one movement', async () => {
    const before = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantId}/movements`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { meta: { totalItems: number } };

    await runWithContext({ tenantId: tenantA.id, userId: ownerUserId, bypassTenantScope: false }, async () => {
      await inventory.increaseStock({
        tenantId: tenantA.id,
        productVariantId: variantId,
        quantity: 3,
        type: InventoryMovementType.PURCHASE,
        reason: 'Supplier restock',
        createdBy: ownerUserId,
      });
      await inventory.decreaseStock({
        tenantId: tenantA.id,
        productVariantId: variantId,
        quantity: 1,
        type: InventoryMovementType.SALE,
        reason: 'POS unit test sale',
        createdBy: ownerUserId,
        referenceType: 'SALE',
        referenceId: 'INV-001',
      });
    });

    const history = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/inventory/${variantId}/movements`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { items: Array<{ type: string; quantity: number }>; meta: { totalItems: number } };
    expect(history.meta.totalItems).toBe(before.meta.totalItems + 2);
    expect(history.items[0]).toMatchObject({ type: 'SALE', quantity: -1 });
    expect(history.items[1]).toMatchObject({ type: 'PURCHASE', quantity: 3 });
  });
});
