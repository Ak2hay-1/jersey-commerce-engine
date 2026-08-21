import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { provisionTenant } from '../src/tenants/provision-tenant';
import { PasswordService } from '../src/auth/password.service';
import { RbacService } from '../src/rbac/rbac.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ApiSuccessInterceptor } from '../src/common/interceptors/api-success.interceptor';
import { attachRealtimeAdapter } from './attach-realtime-adapter';

const TEMP_PASSWORD = 'ChangeMe1!';
const NEXT_PASSWORD = 'OwnerLive!456';

function unwrap<T>(body: { data?: T } | T): T {
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

describe('Go-live login tenants and must-change password', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  const tenantIds: string[] = [];

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
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ApiSuccessInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
    await app.init();

    prisma = app.get(PrismaService);
    const rbac = app.get(RbacService);
    suffix = `${Date.now()}`;
    await prisma.withoutTenantScope(async () => rbac.ensurePermissionCatalog());
  });

  afterAll(async () => {
    if (prisma && tenantIds.length > 0) {
      await prisma.withoutTenantScope(async () => {
        await prisma.refreshToken.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.passwordResetToken.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.userRole.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.rolePermission.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.documentSequence.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.customizationOption.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.expenseCategory.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.authSettings.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      });
    }
    await app?.close();
  });

  it('lists only active shop name and slug for login', async () => {
    const passwords = app.get(PasswordService);
    const hash = await passwords.hash(TEMP_PASSWORD);
    const created = await prisma.withoutTenantScope(async () =>
      provisionTenant(prisma, {
        name: `Live Shop ${suffix}`,
        slug: `live-shop-${suffix}`,
        ownerEmail: `owner-live-${suffix}@example.com`,
        ownerPasswordHash: hash,
        ownerName: 'Live Owner',
      }),
    );
    tenantIds.push(created.tenant.id);
    const suspended = await prisma.withoutTenantScope(async () =>
      provisionTenant(prisma, {
        name: `Suspended Shop ${suffix}`,
        slug: `suspended-shop-${suffix}`,
        ownerEmail: `owner-suspended-${suffix}@example.com`,
        ownerPasswordHash: hash,
        ownerName: 'Suspended Owner',
      }),
    );
    tenantIds.push(suspended.tenant.id);
    await prisma.withoutTenantScope(async () =>
      prisma.tenant.update({ where: { id: suspended.tenant.id }, data: { status: 'SUSPENDED' } }),
    );

    const response = await request(app.getHttpServer()).get('/api/v1/auth/login-tenants').expect(200);
    const payload = unwrap<{ items: Array<Record<string, unknown>> }>(response.body);
    const live = payload.items.find((item) => item.slug === `live-shop-${suffix}`);
    const hidden = payload.items.find((item) => item.slug === `suspended-shop-${suffix}`);
    expect(live).toEqual({ name: `Live Shop ${suffix}`, slug: `live-shop-${suffix}` });
    expect(hidden).toBeUndefined();
    expect(live).not.toHaveProperty('id');
    expect(live).not.toHaveProperty('status');
  });

  it('bootstrap owner must change password before other APIs work', async () => {
    const slug = `boot-shop-${suffix}`;
    const email = `owner-boot-${suffix}@example.com`;
    const passwords = app.get(PasswordService);
    const created = await prisma.withoutTenantScope(async () =>
      provisionTenant(prisma, {
        name: `Boot Shop ${suffix}`,
        slug,
        ownerEmail: email,
        ownerPasswordHash: await passwords.hash(TEMP_PASSWORD),
        ownerName: 'Boot Owner',
        mustChangePassword: true,
      }),
    );
    tenantIds.push(created.tenant.id);

    const owner = await prisma.withoutTenantScope(async () =>
      prisma.user.findFirstOrThrow({ where: { id: created.owner.id } }),
    );
    expect(owner.mustChangePassword).toBe(true);

    const login = unwrap<{ accessToken: string; refreshToken: string; user: { mustChangePassword: boolean } }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: TEMP_PASSWORD, tenantSlug: slug })
          .expect(200)
      ).body,
    );
    expect(login.user.mustChangePassword).toBe(true);

    await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${login.accessToken}`).expect(403);

    const me = unwrap<{ user: { mustChangePassword: boolean } }>(
      (
        await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${login.accessToken}`)
          .expect(200)
      ).body,
    );
    expect(me.user.mustChangePassword).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .send({ currentPassword: TEMP_PASSWORD, newPassword: TEMP_PASSWORD })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .send({ currentPassword: TEMP_PASSWORD, newPassword: NEXT_PASSWORD })
      .expect(200);

    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.accessToken}`).expect(401);

    const nextLogin = unwrap<{ accessToken: string; user: { mustChangePassword: boolean } }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password: NEXT_PASSWORD, tenantSlug: slug })
          .expect(200)
      ).body,
    );
    expect(nextLogin.user.mustChangePassword).toBe(false);
    await request(app.getHttpServer()).get('/api/v1/users').set('Authorization', `Bearer ${nextLogin.accessToken}`).expect(200);
  });

  it('admin-created users must change a temporary password', async () => {
    const passwords = app.get(PasswordService);
    const hash = await passwords.hash(TEMP_PASSWORD);
    const created = await prisma.withoutTenantScope(async () =>
      provisionTenant(prisma, {
        name: `Staff Shop ${suffix}`,
        slug: `staff-shop-${suffix}`,
        ownerEmail: `owner-staff-${suffix}@example.com`,
        ownerPasswordHash: hash,
        ownerName: 'Staff Owner',
      }),
    );
    tenantIds.push(created.tenant.id);
    const ownerLogin = unwrap<{ accessToken: string }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `owner-staff-${suffix}@example.com`,
            password: TEMP_PASSWORD,
            tenantSlug: `staff-shop-${suffix}`,
          })
          .expect(200)
      ).body,
    );

    const staff = unwrap<{ id: string; mustChangePassword: boolean }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${ownerLogin.accessToken}`)
          .send({
            email: `cashier-live-${suffix}@example.com`,
            password: TEMP_PASSWORD,
            name: 'Live Cashier',
            roleCodes: ['CASHIER'],
          })
          .expect(201)
      ).body,
    );
    expect(staff.mustChangePassword).toBe(true);

    const staffLogin = unwrap<{ accessToken: string }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `cashier-live-${suffix}@example.com`,
            password: TEMP_PASSWORD,
            tenantSlug: `staff-shop-${suffix}`,
          })
          .expect(200)
      ).body,
    );
    await request(app.getHttpServer())
      .get('/api/v1/pos/sessions/current')
      .set('Authorization', `Bearer ${staffLogin.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${staff.id}/temporary-password`)
      .set('Authorization', `Bearer ${ownerLogin.accessToken}`)
      .send({ password: NEXT_PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffLogin.accessToken}`)
      .expect(401);

    const afterReset = unwrap<{ accessToken: string; user: { mustChangePassword: boolean } }>(
      (
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: `cashier-live-${suffix}@example.com`,
            password: NEXT_PASSWORD,
            tenantSlug: `staff-shop-${suffix}`,
          })
          .expect(200)
      ).body,
    );
    expect(afterReset.user.mustChangePassword).toBe(true);
  });
});
