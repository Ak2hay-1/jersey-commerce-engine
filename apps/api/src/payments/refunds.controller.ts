import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '../prisma/client';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';

@Controller('refunds')
@ApiTags('refunds')
@TenantScoped()
@RequirePermissions('sales.read')
export class RefundsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List sale refunds for the current tenant' })
  async findAll(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.RefundWhereInput = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        include: {
          sale: { select: { id: true, invoiceNumber: true, customer: { select: { name: true } } } },
          createdBy: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        saleId: item.saleId,
        invoiceNumber: item.sale.invoiceNumber,
        customerName: item.sale.customer?.name ?? null,
        amount: item.amount.toFixed(2),
        reason: item.reason,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt.toISOString(),
      })),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }
}
