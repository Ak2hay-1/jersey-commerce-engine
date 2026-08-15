import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import { CatalogStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toCategorySummary } from '../catalog/catalog.mapper';
import { toBootstrap } from './store-catalog.mapper';

const INACTIVE = new Set(['SUSPENDED', 'CANCELLED']);

@Injectable()
export class StoreBootstrapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async resolve(input: { slug?: string; host?: string }) {
    const tenant = await this.findTenant(input);
    if (!tenant || INACTIVE.has(tenant.status)) {
      throw new UnauthorizedException('Store is not available.');
    }
    return { slug: tenant.slug, name: tenant.name, status: tenant.status };
  }

  async bootstrap(tenantId: string) {
    const tenant = await this.prisma.withoutTenantScope(() =>
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { websiteSettings: true },
      }),
    );
    if (!tenant || INACTIVE.has(tenant.status)) {
      throw new UnauthorizedException('Store is not available.');
    }
    const navigation = await this.prisma.category.findMany({
      where: { tenantId, status: CatalogStatus.ACTIVE, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return toBootstrap({
      tenant,
      website: tenant.websiteSettings,
      navigation: navigation.map(toCategorySummary),
    });
  }

  async findTenant(input: { slug?: string; host?: string }) {
    const slug = input.slug?.trim().toLowerCase();
    if (slug) {
      return this.prisma.withoutTenantScope(() => this.prisma.tenant.findUnique({ where: { slug } }));
    }
    const host = this.normalizeHost(input.host);
    if (!host) {
      return null;
    }
    const mapped = await this.prisma.withoutTenantScope(() =>
      this.prisma.tenantHost.findUnique({ where: { host }, include: { tenant: true } }),
    );
    if (mapped?.tenant) {
      return mapped.tenant;
    }
    const fromSubdomain = this.slugFromPlatformHost(host);
    if (fromSubdomain) {
      return this.prisma.withoutTenantScope(() => this.prisma.tenant.findUnique({ where: { slug: fromSubdomain } }));
    }
    return null;
  }

  normalizeHost(value?: string | null): string | undefined {
    const raw = value?.trim().toLowerCase();
    if (!raw) {
      return undefined;
    }
    return raw.split(':')[0]?.replace(/\.$/, '') || undefined;
  }

  private slugFromPlatformHost(host: string): string | undefined {
    const platform = this.config.get('PLATFORM_DOMAIN', { infer: true })?.trim().toLowerCase();
    if (!platform) {
      return undefined;
    }
    const suffix = `.${platform}`;
    if (!host.endsWith(suffix) || host === platform) {
      return undefined;
    }
    const slug = host.slice(0, -suffix.length);
    if (!slug || slug.includes('.')) {
      return undefined;
    }
    return slug;
  }

  async requireBySlug(slug: string) {
    const tenant = await this.findTenant({ slug });
    if (!tenant || INACTIVE.has(tenant.status)) {
      throw new NotFoundException('Store is not available.');
    }
    return tenant;
  }
}
