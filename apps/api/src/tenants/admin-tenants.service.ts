import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { provisionTenant } from './provision-tenant';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import { toTenantSummary } from '../users/user.mapper';

@Injectable()
export class AdminTenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async createForAdmin(dto: CreateTenantDto) {
    const ownerPasswordHash = await this.passwords.hash(dto.ownerPassword);
    try {
      const created = await this.prisma.withoutTenantScope(async () =>
        provisionTenant(this.prisma as never, {
          name: dto.name,
          slug: dto.slug,
          ownerEmail: dto.ownerEmail,
          ownerPasswordHash,
          ownerName: dto.ownerName,
        }),
      );
      return {
        tenant: toTenantSummary(created.tenant),
        owner: {
          id: created.owner.id,
          email: created.owner.email,
          name: created.owner.name,
          status: created.owner.status,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A tenant with this slug already exists.');
      }
      throw error;
    }
  }
}
