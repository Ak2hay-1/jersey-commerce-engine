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

const PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);

function unwrap<T>(body: { data?: T } & T): T {
  return (body.data ?? body) as T;
}

describe('Phase 3 product and category engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string };
  let tenantB: { id: string; slug: string; ownerEmail: string };
  let accessA: string;
  let accessB: string;
  let cashierToken: string;
  let sportswearId: string;
  let cricketId: string;
  let productId: string;
  let _variantId: string;

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
    tenantA = { id: '', slug: `phase3-a-${suffix}`, ownerEmail: `owner-a-${suffix}@example.com` };
    tenantB = { id: '', slug: `phase3-b-${suffix}`, ownerEmail: `owner-b-${suffix}@example.com` };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 3 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 3 Tenant B',
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
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.withoutTenantScope(async () => {
        await prisma.tenant.deleteMany({ where: { slug: { in: [tenantA.slug, tenantB.slug] } } });
      });
    }
    await app?.close();
  });

  it('creates a category hierarchy', async () => {
    const sportswear = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${accessA}`)
          .send({ name: 'Sportswear', description: 'Root' })
          .expect(201)
      ).body,
    ) as { id: string; slug: string };
    sportswearId = sportswear.id;
    expect(sportswear.slug).toBe('sportswear');

    const cricket = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${accessA}`)
          .send({ name: 'Cricket', parentId: sportswearId })
          .expect(201)
      ).body,
    ) as { id: string };
    cricketId = cricket.id;

    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${accessA}`)
      .send({ name: 'Cricket', parentId: sportswearId })
      .expect(409);
  });

  it('prevents a category from being its own parent or ancestor', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${sportswearId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ parentId: sportswearId })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/categories/${sportswearId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ parentId: cricketId })
      .expect(400);
  });

  it('creates a product with variants, SKUs, barcodes, and prices', async () => {
    const created = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${accessA}`)
          .send({
            name: 'India Cricket Jersey',
            brand: 'Pitch Pro',
            categoryId: cricketId,
            status: 'ACTIVE',
            featured: true,
            variants: [
              {
                sku: `IND-JER-L-${suffix}`,
                barcode: `890${suffix}`.slice(0, 13).padEnd(13, '1'),
                size: 'L',
                colour: 'Blue',
                costPrice: '450.00',
                sellingPrice: '899.00',
                compareAtPrice: '1299.00',
                weight: '0.220',
              },
              {
                sku: `IND-JER-M-${suffix}`,
                size: 'M',
                colour: 'Blue',
                costPrice: '450',
                sellingPrice: '899',
              },
            ],
          })
          .expect(201)
      ).body,
    ) as { id: string; slug: string; variants: Array<{ id: string; sku: string }> };
    productId = created.id;
    _variantId = created.variants[0].id;
    expect(created.slug).toBe('india-cricket-jersey');
  });

  it('rejects duplicate SKU and barcode', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        sku: `IND-JER-L-${suffix}`,
        size: 'XL',
        costPrice: '450',
        sellingPrice: '899',
      })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/variants`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        sku: `IND-JER-XL-${suffix}`,
        barcode: `890${suffix}`.slice(0, 13).padEnd(13, '1'),
        size: 'XL',
        costPrice: '450',
        sellingPrice: '899',
      })
      .expect(409);
  });

  it('rejects invalid pricing and a foreign category', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        name: 'Bad Price Jersey',
        variants: [{ costPrice: '-10', sellingPrice: '100' }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        name: 'Bad Compare Jersey',
        variants: [{ costPrice: '10', sellingPrice: '100', compareAtPrice: '50' }],
      })
      .expect(400);

    const foreignCategory = unwrap(
      (
        await request(app.getHttpServer())
          .post('/api/v1/categories')
          .set('Authorization', `Bearer ${accessB}`)
          .send({ name: 'Foreign Cat' })
          .expect(201)
      ).body,
    ) as { id: string };

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        name: 'Cross Tenant Category',
        categoryId: foreignCategory.id,
        variants: [{ costPrice: '10', sellingPrice: '20' }],
      })
      .expect(400);
  });

  it('searches, filters, sorts, and paginates products', async () => {
    const searched = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ search: 'india', page: 1, limit: 10, sort: 'name' })
      .set('Authorization', `Bearer ${accessA}`)
      .expect(200);
    const payload = searched.body as {
      success: boolean;
      data: Array<{ name: string }>;
      meta: { page: number; limit: number; total: number; totalPages: number };
    };
    expect(payload.success).toBe(true);
    expect(payload.data.some((item) => item.name === 'India Cricket Jersey')).toBe(true);
    expect(payload.meta.limit).toBe(10);
    expect(payload.meta.page).toBe(1);

    const featured = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ featured: true, status: 'ACTIVE', categoryId: cricketId, sort: 'price-asc' })
      .set('Authorization', `Bearer ${accessA}`)
      .expect(200);
    expect(featured.body.data.length).toBeGreaterThan(0);
  });

  it('updates product names without rewriting slugs, then archives instead of hard-deleting', async () => {
    const updated = unwrap(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/products/${productId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .send({ name: 'India Replica Cricket Jersey' })
          .expect(200)
      ).body,
    ) as { slug: string; name: string };
    expect(updated.name).toBe('India Replica Cricket Jersey');
    expect(updated.slug).toBe('india-cricket-jersey');

    const archived = unwrap(
      (
        await request(app.getHttpServer())
          .delete(`/api/v1/products/${productId}`)
          .set('Authorization', `Bearer ${accessA}`)
          .expect(200)
      ).body,
    ) as { status: string };
    expect(archived.status).toBe('ARCHIVED');
  });

  it('manages product images with magic-byte validation', async () => {
    const restored = await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(unwrap(restored.body).status).toBe('ACTIVE');

    const exeRejected = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${accessA}`)
      .attach('file', Buffer.from('MZ'), { filename: 'malware.png', contentType: 'image/png' })
      .expect(400);
    expect(exeRejected.body.success).toBe(false);

    const uploaded = unwrap(
      (
        await request(app.getHttpServer())
          .post(`/api/v1/products/${productId}/images`)
          .set('Authorization', `Bearer ${accessA}`)
          .field('altText', 'Front placeholder')
          .attach('file', PNG, { filename: 'front.png', contentType: 'image/png' })
          .expect(201)
      ).body,
    ) as { id: string; isPrimary: boolean };
    expect(uploaded.isPrimary).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}/images/${uploaded.id}`)
      .set('Authorization', `Bearer ${accessA}`)
      .expect(200);
  });

  it('refuses to delete a category that still has products', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${cricketId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .expect(409);
  });

  it('isolates catalog data between tenants', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${accessB}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${accessB}`)
      .send({ name: 'Hijacked' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${accessB}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/categories/${cricketId}`)
      .set('Authorization', `Bearer ${accessB}`)
      .expect(404);
  });

  it('enforces product create/update/delete permissions for a cashier', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        name: 'Cashier Product',
        variants: [{ costPrice: '10', sellingPrice: '20' }],
      })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ featured: true })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);
  });
});
