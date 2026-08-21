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
const CUSTOMER_PASSWORD = 'FanPass123!';

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

function store(slug: string, extra: Record<string, string> = {}) {
  return { 'X-Tenant-Slug': slug, ...extra };
}

describe('Phase 10 storefront engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let productSlug: string;
  let variantId: string;
  let categorySlug: string;

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
    tenantA = { id: '', slug: `phase10-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase10-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 10 Store A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 10 Store B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantB.id = createdB.tenant.id;
      await prisma.tenant.update({
        where: { id: tenantA.id },
        data: { primaryColor: '#111111', secondaryColor: '#dd2222', accentColor: '#dd2222' },
      });
      await prisma.tenantHost.create({
        data: { tenantId: tenantA.id, host: `shop-a-${suffix}.example.com`, kind: 'DOMAIN', isPrimary: true },
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

    const category = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/categories')
          .set({ Authorization: `Bearer ${accessA}` })
          .send({ name: 'Football', status: 'ACTIVE' })
          .expect(201)
      ).body,
    ) as { id: string; slug: string };
    categorySlug = category.slug;

    const product = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/products')
          .set({ Authorization: `Bearer ${accessA}` })
          .send({
            name: 'Home Kit 2026',
            status: 'ACTIVE',
            featured: true,
            brand: 'Pitch Lab',
            categoryId: category.id,
            variants: [
              {
                sku: `P10-HOME-M-${suffix}`,
                size: 'M',
                colour: 'Red',
                costPrice: '400.00',
                sellingPrice: '1999.00',
                compareAtPrice: '2499.00',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { slug: string; variants: Array<{ id: string }> };
    productSlug = product.slug;
    variantId = product.variants[0]!.id;

    await request(app.getHttpServer())
      .post('/api/v1/inventory/opening-stock')
      .set({ Authorization: `Bearer ${accessA}` })
      .send({ productVariantId: variantId, quantity: 8, reason: 'Phase 10 opening' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves a tenant by slug and configured domain', async () => {
    const bySlug = unwrap(
      (await request(app.getHttpServer()).get(`/api/v1/store/resolve?slug=${tenantA.slug}`).expect(200)).body,
    ) as { slug: string };
    expect(bySlug.slug).toBe(tenantA.slug);
    const byHost = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/store/resolve?host=shop-a-${suffix}.example.com`)
          .expect(200)
      ).body,
    ) as { slug: string };
    expect(byHost.slug).toBe(tenantA.slug);
  });

  it('bootstraps tenant branding without exposing another store', async () => {
    const bootstrap = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/store/bootstrap').set(store(tenantA.slug)).expect(200)).body,
    ) as { tenant: { name: string }; theme: { primaryColor: string }; auth: { passwordLogin: boolean } };
    expect(bootstrap.tenant.name).toBe('Phase 10 Store A');
    expect(bootstrap.theme.primaryColor.toLowerCase()).toBe('#111111');
    expect(bootstrap.auth.passwordLogin).toBe(true);
    await request(app.getHttpServer()).get('/api/v1/store/bootstrap').set(store(tenantB.slug)).expect(200);
  });

  it('lists published products without staff auth and hides cost price', async () => {
    const listed = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/store/products').set(store(tenantA.slug)).expect(200)).body,
    ) as { items: Array<Record<string, unknown>> };
    expect(listed.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(listed)).not.toContain('costPrice');
    const detail = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/store/products/${productSlug}`)
          .set(store(tenantA.slug))
          .expect(200)
      ).body,
    ) as { variants: Array<Record<string, unknown>>; slug: string };
    expect(detail.slug).toBe(productSlug);
    expect(detail.variants[0]).not.toHaveProperty('costPrice');
    const category = unwrap(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/store/categories/${categorySlug}`)
          .set(store(tenantA.slug))
          .expect(200)
      ).body,
    ) as { slug: string };
    expect(category.slug).toBe(categorySlug);

    const search = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/store/search?search=Home')
          .set(store(tenantA.slug))
          .expect(200)
      ).body,
    ) as { products: Array<{ slug: string }>; suggestions: Array<{ type: string }> };
    expect(search.products.some((item) => item.slug === productSlug)).toBe(true);
    expect(search.suggestions.length).toBeGreaterThan(0);
  });

  it('isolates catalog data by tenant', async () => {
    const listed = unwrap(
      (await request(app.getHttpServer()).get('/api/v1/store/products').set(store(tenantB.slug)).expect(200)).body,
    ) as { items: Array<{ slug: string }> };
    expect(listed.items.some((item) => item.slug === productSlug)).toBe(false);
  });

  it('registers a customer, adds to cart, quotes, and checks out', async () => {
    const registered = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/auth/register')
          .set(store(tenantA.slug))
          .send({
            name: 'Arena Fan',
            email: `fan-${suffix}@example.com`,
            password: CUSTOMER_PASSWORD,
          })
          .expect(201)
      ).body,
    ) as { accessToken: string; customer: { email: string } };
    expect(registered.customer.email).toBe(`fan-${suffix}@example.com`);

    const cart = unwrap(
      (await request(app.getHttpServer()).post('/api/v1/store/cart').set(store(tenantA.slug)).expect(201)).body,
    ) as { cartToken: string; items: unknown[] };
    const added = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/cart/items')
          .set(store(tenantA.slug, { 'X-Cart-Token': cart.cartToken }))
          .send({ productVariantId: variantId, quantity: 1 })
          .expect(201)
      ).body,
    ) as { items: Array<{ productName: string; quantity: number }>; cartToken?: string };
    expect(added.items[0]?.quantity).toBe(1);

    const quote = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/checkout/quote')
          .set(store(tenantA.slug, { 'X-Cart-Token': cart.cartToken }))
          .send({ fulfillmentMethod: 'STORE_PICKUP' })
          .expect(201)
      ).body,
    ) as { canCheckout: boolean; totals: { total: string } };
    expect(quote.canCheckout).toBe(true);

    const checkout = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/checkout')
          .set(
            store(tenantA.slug, {
              'X-Cart-Token': cart.cartToken,
              Authorization: `Bearer ${registered.accessToken}`,
            }),
          )
          .send({
            fulfillmentMethod: 'STORE_PICKUP',
            customer: { name: 'Arena Fan', email: `fan-${suffix}@example.com` },
          })
          .expect(201)
      ).body,
    ) as { order: { orderNumber: string; total: string } };
    expect(checkout.order.orderNumber).toMatch(/^ORD-/);

    const orders = unwrap(
      (
        await request(app.getHttpServer())
          .get('/api/v1/store/orders')
          .set(store(tenantA.slug, { Authorization: `Bearer ${registered.accessToken}` }))
          .expect(200)
      ).body,
    ) as { items: Array<{ orderNumber: string }> };
    expect(orders.items.some((item) => item.orderNumber === checkout.order.orderNumber)).toBe(true);
  });

  it('issues a customer session from email OTP when enabled', async () => {
    const saved = unwrap(
      (
        await request(app.getHttpServer())
          .put('/api/v1/auth-settings')
          .set({ Authorization: `Bearer ${accessA}` })
          .send({
            passwordLoginEnabled: true,
            emailOtpEnabled: true,
            smsOtpEnabled: false,
            googleSignInEnabled: false,
            emailProvider: 'CONSOLE',
            smsProvider: 'CONSOLE',
          })
          .expect(200)
      ).body,
    ) as { emailOtpEnabled: boolean; hasResendApiKey: boolean };
    expect(saved.emailOtpEnabled).toBe(true);
    expect(saved.hasResendApiKey).toBe(false);

    const requested = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/auth/otp/request')
          .set(store(tenantA.slug))
          .send({ channel: 'email', email: `otp-${suffix}@example.com` })
          .expect(201)
      ).body,
    ) as { sent: boolean; debugCode?: string };
    expect(requested.sent).toBe(true);
    expect(requested.debugCode).toMatch(/^\d{6}$/);

    const verified = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/store/auth/otp/verify')
          .set(store(tenantA.slug))
          .send({
            channel: 'email',
            email: `otp-${suffix}@example.com`,
            code: requested.debugCode,
            name: 'Otp Fan',
          })
          .expect(201)
      ).body,
    ) as { accessToken: string; customer: { email: string } };
    expect(verified.customer.email).toBe(`otp-${suffix}@example.com`);
    expect(verified.accessToken.length).toBeGreaterThan(20);
  });

  it('rejects password login when the tenant disables it', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/auth-settings')
      .set({ Authorization: `Bearer ${accessA}` })
      .send({
        passwordLoginEnabled: false,
        emailOtpEnabled: true,
        smsOtpEnabled: false,
        googleSignInEnabled: false,
        emailProvider: 'CONSOLE',
        smsProvider: 'CONSOLE',
      })
      .expect(200);

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/store/auth/login')
      .set(store(tenantA.slug))
      .send({ email: `fan-${suffix}@example.com`, password: CUSTOMER_PASSWORD })
      .expect(403);
    expect(rejected.body.error.message).toMatch(/Password sign-in is disabled/);

    await request(app.getHttpServer())
      .put('/api/v1/auth-settings')
      .set({ Authorization: `Bearer ${accessA}` })
      .send({
        passwordLoginEnabled: false,
        emailOtpEnabled: false,
        smsOtpEnabled: false,
        googleSignInEnabled: true,
        emailProvider: 'CONSOLE',
        smsProvider: 'CONSOLE',
      })
      .expect(400);
  });
});
