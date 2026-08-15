import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { asTx } from '../prisma/as-tx';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
      return;
    }
    await this.prisma.withoutTenantScope(async () => write(this.prisma));
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return assertFound(await this.prisma.auditLog.findFirst({ where: { id, tenantId } }), 'Audit log not found');
  }
}
