import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { RoleCode } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthPrincipal } from '../common/context/request-context';

export const USER_PUBLIC_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    select: { role: { select: { id: true, code: true, name: true } } },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationQueryDto & { search?: string }, actor?: AuthPrincipal) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const search = query.search?.trim();
    const hideSuperAdmins = !actor?.roles.includes('SUPER_ADMIN');
    const where: Prisma.UserWhereInput = {
      tenantId,
      ...(hideSuperAdmins ? { userRoles: { none: { role: { code: RoleCode.SUPER_ADMIN } } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: USER_PUBLIC_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.user.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string, actor?: AuthPrincipal) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, select: USER_PUBLIC_SELECT });
    const hidden =
      Boolean(user?.userRoles.some((assignment) => assignment.role.code === RoleCode.SUPER_ADMIN)) &&
      !actor?.roles.includes('SUPER_ADMIN');
    return assertFound(hidden ? null : user, 'User not found');
  }
}
