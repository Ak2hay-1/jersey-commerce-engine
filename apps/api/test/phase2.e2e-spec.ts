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

const PASSWORD = 'OwnerDemo!123';
const CASHIER_PASSWORD = 'CashierDemo!123';

describe('Phase 2 authentication, RBAC, and tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let suffix: string;
  let tenantA: { id: string; slug: string; ownerEmail: string; ownerId: string };
  let tenantB: { id: string; slug: string; ownerEmail: string; ownerId: string };
  let accessA: string;
  let refreshA: string;
  let cashierToken: string;

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
    const passwords = app.get(PasswordService);
    const rbac = app.get(RbacService);
    suffix = `${Date.now()}`;
    tenantA = {
      id: '',
      slug: `phase2-a-${suffix}`,
      ownerEmail: `owner-a-${suffix}@example.com`,
      ownerId: '',
    };
    tenantB = {
      id: '',
      slug: `phase2-b-${suffix}`,
      ownerEmail: `owner-b-${suffix}@example.com`,
      ownerId: '',
    };

    await prisma.withoutTenantScope(async () => {
      await rbac.ensurePermissionCatalog();
      const ownerHash = await passwords.hash(PASSWORD);
      const createdA = await provisionTenant(prisma, {
        name: 'Phase 2 Tenant A',
        slug: tenantA.slug,
        ownerEmail: tenantA.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner A',
      });
      const createdB = await provisionTenant(prisma, {
        name: 'Phase 2 Tenant B',
        slug: tenantB.slug,
        ownerEmail: tenantB.ownerEmail,
        ownerPasswordHash: ownerHash,
        ownerName: 'Owner B',
      });
      tenantA.id = createdA.tenant.id;
      tenantA.ownerId = createdA.owner.id;
      tenantB.id = createdB.tenant.id;
      tenantB.ownerId = createdB.owner.id;
    });

    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: tenantA.ownerEmail, password: PASSWORD, tenantSlug: tenantA.slug })
      .expect(200);
    const bodyA = loginA.body.data ?? loginA.body;
    accessA = bodyA.accessToken;
    refreshA = bodyA.refreshToken;

    const cashier = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        email: `cashier-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Cashier A',
        roleCodes: ['CASHIER'], mustChangePassword: false,
      })
      .expect(201);
    const cashierLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `cashier-a-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        tenantSlug: tenantA.slug,
      })
      .expect(200);
    cashierToken = (cashierLogin.body.data ?? cashierLogin.body).accessToken;
    expect(cashier.body.data?.id ?? cashier.body.id).toBeDefined();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.withoutTenantScope(async () => {
        const ids = [tenantA.id, tenantB.id].filter(Boolean);
        await prisma.refreshToken.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.passwordResetToken.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.auditLog.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.userRole.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.rolePermission.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.user.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.role.deleteMany({ where: { tenantId: { in: ids } } });
        await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
      });
    }
    await app?.close();
  });

  it('Test 1: Tenant A user can access Tenant A data', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .expect(200);
    const payload = response.body.data ?? response.body;
    const emails = (payload.items as Array<{ email: string }>).map((item) => item.email);
    expect(emails).toContain(tenantA.ownerEmail);
  });

  it('Test 2: Tenant A user cannot access Tenant B data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/${tenantB.ownerId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .expect(404);
    expect(response.body.success).toBe(false);
  });

  it('Test 3: Tenant A user cannot modify Tenant B data', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${tenantB.ownerId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('Test 4: Tenant A user cannot delete Tenant B data', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${tenantB.ownerId}`)
      .set('Authorization', `Bearer ${accessA}`)
      .expect(404);
  });

  it('Test 5: User without permission receives 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        email: `blocked-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Blocked',
        roleCodes: ['CASHIER'], mustChangePassword: false,
      })
      .expect(403);
  });

  it('Test 6: Unauthenticated user receives 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('Test 7: Cashier cannot perform owner-only operations', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/users/${tenantA.ownerId}/roles`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ roleCode: 'OWNER' })
      .expect(403);
  });

  it('Test 8: Inactive/suspended users cannot authenticate', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${accessA}`)
      .send({
        email: `inactive-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        name: 'Inactive User',
        roleCodes: ['CASHIER'], mustChangePassword: false,
      })
      .expect(201);
    const userId = created.body.data?.id ?? created.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/users/${userId}/deactivate`)
      .set('Authorization', `Bearer ${accessA}`)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `inactive-${suffix}@example.com`,
        password: CASHIER_PASSWORD,
        tenantSlug: tenantA.slug,
      })
      .expect(401);
    expect(login.body.error?.message).toBe('Invalid email or password.');
  });

  it('refreshes an access token and logs out', async () => {
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshA })
      .expect(200);
    const nextAccess = (refreshed.body.data ?? refreshed.body).accessToken;
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${nextAccess}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${nextAccess}`)
      .send({ refreshToken: (refreshed.body.data ?? refreshed.body).refreshToken })
      .expect(200);
  });
});
