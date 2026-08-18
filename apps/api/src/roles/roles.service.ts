import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';

const roleInclude = {
  rolePermissions: {
    select: { permission: { select: { id: true, code: true, name: true, group: true } } },
  },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId };
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
