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

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

function store(slug: string, extra: Record<string, string> = {}) {
  return { 'X-Tenant-Slug': slug, ...extra };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Phase 11 custom jersey order engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierA: string;

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
    tenantA = { id: '', slug: `phase11-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase11-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 11 Store A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 11 Store B',
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

  it('rejects a guest enquiry without storefront tenant context or contact details', async () => {
    await request(app.getHttpServer()).post('/api/v1/store/custom-orders/inquiry').send({ name: 'Rahul' }).expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/store/custom-orders/inquiry')
      .set(store(tenantA.slug))
      .send({ name: 'Rahul Patil' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/store/custom-orders/inquiry')
      .set(store(tenantA.slug))
      .send({ name: 'Rahul Patil', phone: '9876500111', tenantId: tenantB.id })
      .expect(400);
  });

  it('runs enquiry → quote → design → deposit → production → completion with CRM and isolation', async () => {
    const enquiry = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/custom-orders/inquiry')
          .set(store(tenantA.slug))
          .field('name', 'Rahul Patil')
          .field('phone', `98765${suffix.slice(-5)}`)
          .field('email', `rahul-${suffix}@example.com`)
          .field('teamName', 'Pune Warriors')
          .field('quantity', '48')
          .field('type', 'TEAM_ORDER')
          .field('preferredColours', 'Navy / Gold')
          .attach('files', PNG, { filename: '../../kit.png', contentType: 'image/png' })
          .expect(201)
      ).body,
    ) as { publicId: string; orderNumber: string; status: string };

    expect(enquiry.status).toBe('INQUIRY');
    expect(enquiry.orderNumber).toMatch(/^CO-/);

    const listed = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/custom-orders').set(auth(accessA)).expect(200)).body,
    ) as { items: Array<{ id: string; customer: { id: string } }> };
    const created = listed.items[0];
    expect(created).toBeTruthy();
    const orderId = created!.id;
    const customerId = created!.customer.id;

    await request(app.getHttpServer())
      .get(`/api/v1/store/custom-orders/${enquiry.publicId}`)
      .set(store(tenantB.slug))
      .expect(404);

    await request(app.getHttpServer()).get(`/api/v1/custom-orders/${orderId}`).set(auth(accessB)).expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/custom-orders/${orderId}`)
      .set(auth(accessA))
      .send({
        type: 'TEAM_ORDER',
        items: [
          { lineType: 'SIZE_QUANTITY', size: 'S', quantity: 5, unitPrice: '800.00' },
          { lineType: 'SIZE_QUANTITY', size: 'M', quantity: 12, unitPrice: '800.00' },
          { lineType: 'SIZE_QUANTITY', size: 'L', quantity: 18, unitPrice: '800.00' },
          { lineType: 'SIZE_QUANTITY', size: 'XL', quantity: 10, unitPrice: '800.00' },
          { lineType: 'SIZE_QUANTITY', size: 'XXL', quantity: 3, unitPrice: '800.00' },
        ],
      })
      .expect(200);

    const converted = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/custom-orders/${orderId}`).set(auth(accessA)).expect(200)).body,
    ) as { status: string; estimatedQuantity: number; orderingMode: string };
    expect(converted.status).toBe('QUOTATION');
    expect(converted.estimatedQuantity).toBe(48);
    expect(converted.orderingMode).toBe('SIZE_QUANTITY');

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/quote`)
      .set(auth(cashierA))
      .send({ unitPrice: '800.00', quantity: 48, depositRequired: '20000.00' })
      .expect(403);

    const quoteV1 = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/custom-orders/${orderId}/quote`)
          .set(auth(accessA))
          .send({
            unitPrice: '800.00',
            quantity: 48,
            customizationCharges: '9600.00',
            discount: '2000.00',
            tax: '0.00',
            shippingAmount: '500.00',
            depositRequired: '20000.00',
          })
          .expect(201)
      ).body,
    ) as { quotes: Array<{ version: number; isCurrent: boolean; quoteNumber: string; total: string }> };
    expect(quoteV1.quotes[0]?.version).toBe(1);
    expect(quoteV1.quotes[0]?.total).toBe('46500.00');

    const quoteV2 = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/custom-orders/${orderId}/quote`)
          .set(auth(accessA))
          .send({
            unitPrice: '800.00',
            quantity: 48,
            customizationCharges: '9600.00',
            discount: '2000.00',
            shippingAmount: '500.00',
            depositRequired: '20000.00',
            send: true,
          })
          .expect(201)
      ).body,
    ) as { status: string; quotes: Array<{ version: number; isCurrent: boolean; quoteNumber: string }> };
    expect(quoteV2.status).toBe('QUOTE_SENT');
    expect(quoteV2.quotes).toHaveLength(2);
    expect(quoteV2.quotes.find((row) => row.version === 1)?.isCurrent).toBe(false);
    expect(quoteV2.quotes.find((row) => row.version === 2)?.isCurrent).toBe(true);
    expect(quoteV2.quotes[0]?.quoteNumber).toBe(quoteV2.quotes[1]?.quoteNumber);

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/design`)
      .set(auth(accessA))
      .attach('file', PNG, { filename: 'design-v1.png', contentType: 'image/png' })
      .field('notes', 'First kit mock')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/design`)
      .set(auth(accessA))
      .attach('file', PNG, { filename: 'design-v2.png', contentType: 'image/png' })
      .field('notes', 'Revised collar')
      .expect(201);

    const afterDesigns = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/custom-orders/${orderId}`).set(auth(accessA)).expect(200)).body,
    ) as { designs: Array<{ version: number; approvalStatus: string }> };
    expect(afterDesigns.designs.map((row) => row.version).sort()).toEqual([1, 2]);
    expect(afterDesigns.designs.every((row) => row.approvalStatus === 'PENDING')).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/design/request-approval`)
      .set(auth(accessA))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/store/custom-orders/${enquiry.publicId}/request-design-changes`)
      .set(store(tenantA.slug))
      .send({ comment: 'Move sponsor logo higher' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/design`)
      .set(auth(accessA))
      .attach('file', PNG, { filename: 'design-v3.png', contentType: 'image/png' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/store/custom-orders/${enquiry.publicId}/approve-design`)
      .set(store(tenantA.slug))
      .send({ comment: 'Looks good' })
      .expect(201);

    const accepted = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/store/custom-orders/${enquiry.publicId}/accept-quote`)
          .set(store(tenantA.slug))
          .expect(201)
      ).body,
    ) as { status: string; depositRequired: string; paymentStatus: string };
    expect(accepted.status).toBe('DEPOSIT_PENDING');
    expect(accepted.depositRequired).toBe('20000.00');
    expect(accepted.paymentStatus).toBe('UNPAID');

    const afterDeposit = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/custom-orders/${orderId}/deposit`)
          .set(auth(cashierA))
          .send({ method: 'CASH', amount: '20000.00', amountReceived: '20000.00', purpose: 'DEPOSIT' })
          .expect(201)
      ).body,
    ) as { status: string; paymentStatus: string; depositPaid: string; balanceDue: string; total: string };
    expect(afterDeposit.status).toBe('CONFIRMED');
    expect(afterDeposit.paymentStatus).toBe('DEPOSIT_RECEIVED');
    expect(afterDeposit.depositPaid).toBe('20000.00');
    expect(afterDeposit.balanceDue).toBe('26500.00');
    expect(afterDeposit.total).toBe('46500.00');

    await request(app.getHttpServer())
      .patch(`/api/v1/custom-orders/${orderId}/status`)
      .set(auth(accessA))
      .send({ status: 'INQUIRY' })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/api/v1/custom-orders/${orderId}/status`)
      .set(auth(accessA))
      .send({ status: 'PRODUCTION', productionStatus: 'PRODUCTION', note: 'Printing started' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/notes`)
      .set(auth(accessA))
      .send({ body: 'Use polyester 180 GSM. Number 10 should be white.' })
      .expect(201);

    const afterBalance = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/custom-orders/${orderId}/deposit`)
          .set(auth(cashierA))
          .send({ method: 'UPI', amount: '26500.00', confirmed: true, reference: `UPI-P11-${suffix}`, purpose: 'BALANCE' })
          .expect(201)
      ).body,
    ) as { paymentStatus: string; balanceDue: string };
    expect(afterBalance.paymentStatus).toBe('PAID');
    expect(afterBalance.balanceDue).toBe('0.00');

    await request(app.getHttpServer())
      .patch(`/api/v1/custom-orders/${orderId}/status`)
      .set(auth(accessA))
      .send({ status: 'READY' })
      .expect(200);

    const completed = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/custom-orders/${orderId}/status`)
          .set(auth(accessA))
          .send({ status: 'COMPLETED' })
          .expect(200)
      ).body,
    ) as { status: string };
    expect(completed.status).toBe('COMPLETED');

    const profile = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${customerId}`).set(auth(accessA)).expect(200)).body,
    ) as { customOrderMetrics: { totalOrders: number; totalSpent: string } };
    expect(profile.customOrderMetrics.totalOrders).toBe(1);
    expect(profile.customOrderMetrics.totalSpent).toBe('46500.00');

    const history = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/customers/${customerId}/history`).set(auth(accessA)).expect(200))
        .body,
    ) as { items: Array<{ type: string; reference: string }> };
    expect(history.items.some((item) => item.type === 'CUSTOM_ORDER' && item.reference === enquiry.orderNumber)).toBe(true);

    const timeline = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/custom-orders/${orderId}/timeline`).set(auth(accessA)).expect(200))
        .body,
    ) as { items: Array<{ type: string }> };
    expect(timeline.items.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        'INQUIRY_RECEIVED',
        'QUOTE_CREATED',
        'DESIGN_UPLOADED',
        'DESIGN_APPROVED',
        'DEPOSIT_RECEIVED',
        'FINAL_PAYMENT',
      ]),
    );
  });

  it('supports player-list quantities and rejects expired quotes', async () => {
    const enquiry = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/custom-orders/inquiry')
          .set(store(tenantA.slug))
          .send({
            name: 'Amit Kulkarni',
            phone: `98670${suffix.slice(-5)}`,
            teamName: 'Pune Warriors',
            type: 'TEAM_ORDER',
          })
          .expect(201)
      ).body,
    ) as { publicId: string };

    const listed = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/custom-orders?search=Amit')
          .set(auth(accessA))
          .expect(200)
      ).body,
    ) as { items: Array<{ id: string }> };
    const orderId = listed.items[0]!.id;

    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/custom-orders/${orderId}`)
          .set(auth(accessA))
          .send({
            items: [
              { lineType: 'PLAYER_LIST', playerName: 'Rahul', jerseyNumber: '10', size: 'M', quantity: 1, unitPrice: '900.00' },
              { lineType: 'PLAYER_LIST', playerName: 'Amit', jerseyNumber: '7', size: 'L', quantity: 1, unitPrice: '900.00' },
              { lineType: 'PLAYER_LIST', playerName: 'Akshay', jerseyNumber: '18', size: 'XL', quantity: 1, unitPrice: '900.00' },
            ],
          })
          .expect(200)
      ).body,
    ) as { estimatedQuantity: number; orderingMode: string };
    expect(updated.estimatedQuantity).toBe(3);
    expect(updated.orderingMode).toBe('PLAYER_LIST');

    await request(app.getHttpServer())
      .post(`/api/v1/custom-orders/${orderId}/quote`)
      .set(auth(accessA))
      .send({
        unitPrice: '900.00',
        quantity: 3,
        depositRequired: '500.00',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
        send: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/store/custom-orders/${enquiry.publicId}/accept-quote`)
      .set(store(tenantA.slug))
      .expect(409);
  });

  it('rejects unsafe design uploads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/store/custom-orders/inquiry')
      .set(store(tenantA.slug))
      .field('name', 'Unsafe File')
      .field('phone', `98111${suffix.slice(-5)}`)
      .attach('files', Buffer.from([0x4d, 0x5a, 0x90, 0x00]), { filename: 'virus.exe', contentType: 'application/octet-stream' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/store/custom-orders/inquiry')
      .set(store(tenantA.slug))
      .field('name', 'Text File')
      .field('phone', `98222${suffix.slice(-5)}`)
      .attach('files', Buffer.from('not an image'), { filename: 'note.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('reuses an existing CRM customer for a matching guest phone', async () => {
    const phone = `98333${suffix.slice(-5)}`;
    const first = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/custom-orders/inquiry')
          .set(store(tenantA.slug))
          .send({ name: 'Same Fan', phone, email: `fan-${suffix}@example.com`, type: 'CUSTOM_JERSEY' })
          .expect(201)
      ).body,
    ) as { publicId: string };

    await request(app.getHttpServer())
      .post('/api/v1/store/custom-orders/inquiry')
      .set(store(tenantA.slug))
      .send({ name: 'Same Fan Again', phone, type: 'BULK_ORDER' })
      .expect(201);

    const list = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/custom-orders?search=Same Fan').set(auth(accessA)).expect(200)).body,
    ) as { items: Array<{ customer: { id: string }; publicId: string }>; meta: { totalItems: number } };

    const related = list.items.filter((item) => item.publicId === first.publicId || item.customer);
    const ids = new Set(list.items.map((item) => item.customer.id));
    expect(ids.size).toBe(1);
    expect(related.length).toBeGreaterThanOrEqual(1);
  });
});
