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

describe('Phase 7 customers and CRM', () => {
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
  let variantId: string;
  let rahulId: string;
  let amitId: string;
  let snehaId: string;
  let tenantBCustomerId: string;
  let footballTagId: string;
  let invoiceNumber: string;

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
    tenantA = { id: '', slug: `phase7-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase7-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 7 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 7 Tenant B',
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
        password: CASHIER_PASSWORD,
        name: 'Cashier A',
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
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(accessA))
      .send({
        email: `website-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Website A',
        roleCodes: ['WEBSITE_MANAGER'], mustChangePassword: false,
      })
      .expect(201);

    cashierToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: `cashier-a-${suffix}@example.com`, password: CASHIER_PASSWORD, tenantSlug: tenantA.slug })
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
    websiteToken = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `website-a-${suffix}@example.com`,
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
            name: 'CRM Jersey',
            status: 'ACTIVE',
            variants: [
              {
                sku: `CRM-JER-L-${suffix}`,
                barcode: `8907${suffix}`.slice(0, 13).padEnd(13, '7'),
                size: 'L',
                colour: 'Blue',
                costPrice: '400.00',
                sellingPrice: '999.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { variants: Array<{ id: string }> };
    variantId = product.variants[0].id;
    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set(auth(accessA))
      .send({ productVariantId: variantId, quantity: 50, reason: 'Phase 7 opening stock' })
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

  it('rejects unauthenticated CRM access with 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/customers').expect(401);
  });

  it('creates, reads, updates, and deactivates customers', async () => {
    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessA))
          .send({
            name: 'Rahul Patil',
            phone: '+91 98765 43210',
            email: 'rahul@example.invalid',
            address: '14 Club Road',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411001',
            preference: { whatsappOptIn: true },
          })
          .expect(201)
      ).body,
    ) as { id: string; phone: string; preference: { whatsappOptIn: boolean }; status: string };
    rahulId = created.id;
    expect(created.phone).toBe('9876543210');
    expect(created.preference.whatsappOptIn).toBe(true);
    expect(created.status).toBe('ACTIVE');

    const listed = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/customers').set(auth(accessA)).expect(200)).body,
    ) as { items: Array<{ id: string }> };
    expect(listed.items.some((item) => item.id === rahulId)).toBe(true);

    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/customers/${rahulId}`)
          .set(auth(accessA))
          .send({ city: 'Mumbai' })
          .expect(200)
      ).body,
    ) as { city: string };
    expect(updated.city).toBe('Mumbai');

    amitId = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessA))
          .send({ name: 'Amit Desai', phone: '9123456780', email: 'amit@example.invalid' })
          .expect(201)
      ).body,
    ).id as string;
    snehaId = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessA))
          .send({ name: 'Sneha Kulkarni', phone: '9000011122' })
          .expect(201)
      ).body,
    ).id as string;

    const noHistory = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessA))
          .send({ name: 'Temp Guest', phone: '9111111111' })
          .expect(201)
      ).body,
    ) as { id: string };
    const deleted = unwrap(
      (await request(app.getHttpServer()).delete(`/api/v1/customers/${noHistory.id}`).set(auth(accessA)).expect(200))
        .body,
    ) as { deleted: boolean };
    expect(deleted.deleted).toBe(true);
  });

  it('searches by name, phone, and email including POS lookup', async () => {
    const byPhone = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/customers')
          .query({ search: '9876543210' })
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string; name: string }> };
    expect(byPhone.items.some((item) => item.id === rahulId)).toBe(true);

    const byName = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/customers')
          .query({ search: 'Amit' })
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(byName.items.some((item) => item.id === amitId)).toBe(true);

    const byEmail = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/customers')
          .query({ search: 'rahul@example.invalid' })
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(byEmail.items.some((item) => item.id === rahulId)).toBe(true);

    const pos = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/pos/customers')
          .query({ search: '9876543210' })
          .set(auth(cashierToken))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    expect(pos.items.some((item) => item.id === rahulId)).toBe(true);
  });

  it('warns on duplicate phone and email without merging', async () => {
    const phoneDup = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(accessA))
      .send({ name: 'Rahul Clone', phone: '9876543210' })
      .expect(409);
    expect(phoneDup.body.error.details.possibleMatches[0].id).toBe(rahulId);

    const emailDup = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(accessA))
      .send({ name: 'Rahul Clone', email: 'rahul@example.invalid' })
      .expect(409);
    expect(emailDup.body.error.details.possibleMatches[0].matchedOn).toContain('email');

    const forced = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessA))
          .send({ name: 'Rahul Clone', phone: '9876543210', allowDuplicate: true })
          .expect(201)
      ).body,
    ) as { id: string };
    expect(forced.id).not.toBe(rahulId);
  });

  it('attaches customers from POS, keeps walk-in optional, and reflects completed sales', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pos/sessions/open')
      .set(auth(cashierToken))
      .send({ openingCash: '2000.00' })
      .expect(201);

    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/pos/cart')
      .set(auth(cashierToken))
      .send({ customerId: rahulId })
      .expect(200);

    const sale = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sales/complete')
          .set(auth(cashierToken))
          .send({ payments: [{ method: 'CASH', amount: '1998.00', amountReceived: '2000.00' }] })
          .expect(201)
      ).body,
    ) as { id: string; invoiceNumber: string; customerId: string };
    invoiceNumber = sale.invoiceNumber;
    expect(sale.customerId).toBe(rahulId);

    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/pos/cart')
      .set(auth(cashierToken))
      .send({ customerId: rahulId })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/pos/sales/complete')
      .set(auth(cashierToken))
      .send({ payments: [{ method: 'CASH', amount: '999.00', amountReceived: '999.00' }] })
      .expect(201);

    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({}).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/api/v1/pos/cart')
      .set(auth(cashierToken))
      .send({ customerId: rahulId })
      .expect(200);
    const cancelled = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sales/complete')
          .set(auth(cashierToken))
          .send({ payments: [{ method: 'CASH', amount: '999.00', amountReceived: '999.00' }] })
          .expect(201)
      ).body,
    ) as { id: string };
    await request(app.getHttpServer())
      .post(`/api/v1/pos/sales/${cancelled.id}/cancel`)
      .set(auth(accessA))
      .send({ reason: 'Test cancel' })
      .expect(200);

    await request(app.getHttpServer()).post('/api/v1/pos/cart').set(auth(cashierToken)).send({ walkIn: true }).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/pos/cart/items')
      .set(auth(cashierToken))
      .send({ productVariantId: variantId, quantity: 1 })
      .expect(201);
    const walkIn = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/pos/sales/complete')
          .set(auth(cashierToken))
          .send({ payments: [{ method: 'CASH', amount: '999.00', amountReceived: '999.00' }] })
          .expect(201)
      ).body,
    ) as { customerId: string | null };
    expect(walkIn.customerId).toBeNull();
  });

  it('includes POS and website orders in history and excludes cancelled sales from metrics', async () => {
    await prisma.withoutTenantScope(async () => {
      await prisma.order.create({
        data: {
          tenantId: tenantA.id,
          orderNumber: `ORD-${suffix}`,
          customerId: rahulId,
          source: 'WEBSITE',
          status: 'COMPLETED',
          subtotal: '1550.00',
          total: '1550.00',
          items: {
            create: {
              tenantId: tenantA.id,
              productVariantId: variantId,
              quantity: 1,
              unitPrice: '1550.00',
              costPrice: '400.00',
              total: '1550.00',
            },
          },
        },
      });
      await prisma.order.create({
        data: {
          tenantId: tenantA.id,
          orderNumber: `ORD-CXL-${suffix}`,
          customerId: rahulId,
          source: 'WEBSITE',
          status: 'CANCELLED',
          subtotal: '500.00',
          total: '500.00',
          items: {
            create: {
              tenantId: tenantA.id,
              productVariantId: variantId,
              quantity: 1,
              unitPrice: '500.00',
              costPrice: '400.00',
              total: '500.00',
            },
          },
        },
      });
      await prisma.sale.create({
        data: {
          tenantId: tenantA.id,
          invoiceNumber: `INV-AMIT-${suffix}`,
          customerId: amitId,
          subtotal: '18200.00',
          total: '18200.00',
          tax: '0',
          status: 'COMPLETED',
          items: {
            create: {
              tenantId: tenantA.id,
              productVariantId: variantId,
              productName: 'CRM Jersey',
              sku: `CRM-JER-L-${suffix}`,
              quantity: 1,
              unitPrice: '18200.00',
              costPrice: '400.00',
              total: '18200.00',
            },
          },
        },
      });
    });

    const profile = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${rahulId}`).set(auth(accessA)).expect(200)).body,
    ) as {
      metrics: { totalOrders: number; totalSpent: string; averageOrder: string; totalItemsPurchased: number };
      primarySegment: string;
      segments: string[];
    };
    expect(profile.metrics.totalOrders).toBe(3);
    expect(profile.metrics.totalSpent).toBe('4547.00');
    expect(profile.metrics.averageOrder).toBe('1515.67');
    expect(profile.metrics.totalItemsPurchased).toBe(4);
    expect(profile.segments).toContain('REPEAT');

    const history = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${rahulId}/history`).set(auth(accessA)).expect(200))
        .body,
    ) as { items: Array<{ type: string; reference: string; status: string }>; meta: { totalItems: number } };
    expect(history.items.some((item) => item.reference === invoiceNumber)).toBe(true);
    expect(history.items.some((item) => item.type === 'ORDER' && item.status === 'COMPLETED')).toBe(true);
    expect(history.items.some((item) => item.status === 'CANCELLED')).toBe(true);

    const activity = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${rahulId}/activity`).set(auth(accessA)).expect(200))
        .body,
    ) as { items: Array<{ type: string }> };
    expect(activity.items.some((item) => item.type === 'CUSTOMER_CREATED')).toBe(true);
    expect(activity.items.some((item) => item.type === 'POS_SALE')).toBe(true);
    expect(activity.items.some((item) => item.type === 'ORDER')).toBe(true);
  });

  it('assigns tags, records notes, and enforces note permissions', async () => {
    const tag = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/customers/${rahulId}/tags`)
          .set(auth(accessA))
          .send({ name: 'Football' })
          .expect(201)
      ).body,
    ) as { id: string; name: string };
    footballTagId = tag.id;
    expect(tag.name).toBe('Football');

    await request(app.getHttpServer())
      .post(`/api/v1/customers/${rahulId}/tags`)
      .set(auth(accessA))
      .send({ name: 'VIP' })
      .expect(201);

    const profile = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${rahulId}`).set(auth(accessA)).expect(200)).body,
    ) as { tags: Array<{ name: string }> };
    expect(profile.tags.map((item) => item.name).sort()).toEqual(['Football', 'VIP']);

    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${rahulId}/tags/${footballTagId}`)
      .set(auth(accessA))
      .expect(200);

    const note = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/customers/${rahulId}/notes`)
          .set(auth(accessA))
          .send({ body: 'Usually purchases football jerseys, prefers size L.' })
          .expect(201)
      ).body,
    ) as { body: string; createdBy: { name: string } };
    expect(note.body).toContain('football jerseys');

    await request(app.getHttpServer())
      .get(`/api/v1/customers/${rahulId}/notes`)
      .set(auth(cashierToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${rahulId}/notes`)
      .set(auth(cashierToken))
      .send({ body: 'cashier should not write notes' })
      .expect(403);
  });

  it('returns dashboard, top, repeat, and inactive reports', async () => {
    const summary = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/customers/summary').set(auth(accessA)).expect(200)).body,
    ) as { totalCustomers: number; repeatCustomers: number; settings: { inactiveDays: number } };
    expect(summary.totalCustomers).toBeGreaterThanOrEqual(3);
    expect(summary.repeatCustomers).toBeGreaterThanOrEqual(1);
    expect(summary.settings.inactiveDays).toBe(90);

    const top = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/customers/top')
          .query({ sort: 'totalSpent' })
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ customer: { id: string }; totalSpent: string; rank: number }> };
    expect(top.items[0].rank).toBe(1);
    expect(top.items.some((item) => item.customer.id === amitId && item.totalSpent === '18200.00')).toBe(true);

    const repeat = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/customers/repeat').set(auth(accessA)).expect(200)).body,
    ) as { items: Array<{ customer: { id: string }; purchaseCount: number }> };
    expect(repeat.items.some((item) => item.customer.id === rahulId && item.purchaseCount >= 2)).toBe(true);

    await prisma.withoutTenantScope(async () => {
      await prisma.customer.update({
        where: { id: snehaId },
        data: { createdAt: new Date(Date.now() - 3 * 86_400_000) },
      });
    });
    const inactive = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/customers/inactive')
          .query({ inactiveDays: 1 })
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ customer: { id: string }; daysInactive: number }> };
    expect(inactive.items.some((item) => item.customer.id === snehaId)).toBe(true);
  });

  it('deactivates customers with history and isolates tenants', async () => {
    const archived = unwrap(
      (await request(app.getHttpServer()).delete(`/api/v1/customers/${rahulId}`).set(auth(accessA)).expect(200)).body,
    ) as { archived: boolean; status: string };
    expect(archived.archived).toBe(true);
    expect(archived.status).toBe('INACTIVE');

    tenantBCustomerId = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/customers')
          .set(auth(accessB))
          .send({ name: 'Tenant B Buyer', phone: '9876543210' })
          .expect(201)
      ).body,
    ).id as string;

    await request(app.getHttpServer()).get(`/api/v1/customers/${tenantBCustomerId}`).set(auth(accessA)).expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${tenantBCustomerId}/history`)
      .set(auth(accessA))
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${tenantBCustomerId}`)
      .set(auth(accessA))
      .send({ name: 'Hijacked' })
      .expect(404);

    const tenantAList = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/customers').set(auth(accessA)).expect(200)).body,
    ) as { items: Array<{ id: string }> };
    expect(tenantAList.items.some((item) => item.id === tenantBCustomerId)).toBe(false);
  });

  it('enforces CRM permissions', async () => {
    await request(app.getHttpServer()).get('/api/v1/customers').set(auth(inventoryToken)).expect(200);
    await request(app.getHttpServer()).get('/api/v1/customers').set(auth(websiteToken)).expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(inventoryToken))
      .send({ name: 'No Create' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${amitId}`)
      .set(auth(cashierToken))
      .send({ name: 'No Update' })
      .expect(403);
    await request(app.getHttpServer()).delete(`/api/v1/customers/${amitId}`).set(auth(cashierToken)).expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${amitId}/tags`)
      .set(auth(cashierToken))
      .send({ name: 'VIP' })
      .expect(403);
  });
});
