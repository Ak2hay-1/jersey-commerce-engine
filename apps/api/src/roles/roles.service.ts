import { Injectable } from '@nestjs/common';
import { RoleCode } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthPrincipal } from '../common/context/request-context';

const roleInclude = {
  rolePermissions: {
    select: { permission: { select: { id: true, code: true, name: true, group: true } } },
  },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationQueryDto, actor?: AuthPrincipal) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = {
      tenantId,
      ...(actor?.roles.includes('SUPER_ADMIN') ? {} : { code: { not: RoleCode.SUPER_ADMIN } }),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.role.findMany({ where, include: roleInclude, orderBy: { name: 'asc' }, skip, take }),
      this.prisma.role.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return assertFound(
      await this.prisma.role.findFirst({ where: { id, tenantId }, include: roleInclude }),
      'Role not found',
    );
  }
}
