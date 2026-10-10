import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { asTx } from '../prisma/as-tx';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RealtimeService } from '../realtime/realtime.service';

export interface AuditLogInput {
  action: string;
  tenantId?: string;
  userId?: string;
  entity: string;
  entityId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async log(input: AuditLogInput, db?: object): Promise<void> {
    const write = async (client: object) => {
      await asTx(client).auditLog.create({
        data: {
          action: input.action,
          tenantId: input.tenantId,
          userId: input.userId,
          entity: input.entity,
          entityId: input.entityId,
          oldValue: input.oldValue,
          newValue: input.newValue,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    };
    if (db) {
      await write(db);
    } else {
      await this.prisma.withoutTenantScope(async () => write(this.prisma));
    }
    void this.realtime.publish({
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      tenantId: input.tenantId,
    });
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto & { search?: string; entity?: string; entityId?: string; userId?: string },
  ) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const search = query.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { entity: { contains: search, mode: 'insensitive' } },
              { entityId: search },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return assertFound(await this.prisma.auditLog.findFirst({ where: { id, tenantId } }), 'Audit log not found');
  }
}
