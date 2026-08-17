import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { code: 'asc' }], skip, take }),
      this.prisma.permission.count(),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(id: string) {
    return assertFound(await this.prisma.permission.findUnique({ where: { id } }), 'Permission not found');
  }
}
