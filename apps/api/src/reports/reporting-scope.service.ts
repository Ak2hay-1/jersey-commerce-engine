import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { AuthPrincipal } from '../common/context/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { resolveDateRange, toReportRangeDto, type ResolvedDateRange } from './date-range';
import type { DashboardQueryDto, SalesReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportingScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    actor: AuthPrincipal,
    query: Pick<DashboardQueryDto & SalesReportQueryDto, 'preset' | 'from' | 'to'>,
  ): Promise<{ range: ResolvedDateRange; dto: ReturnType<typeof toReportRangeDto> }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: actor.tenantId },
      select: { timezone: true },
    });
    const range = resolveDateRange({
      preset: query.preset,
      from: query.from,
      to: query.to,
      timeZone: tenant?.timezone || 'Asia/Kolkata',
    });
    return { range, dto: toReportRangeDto(range) };
  }
}

export function sqlSourceFilter(source?: string): Prisma.Sql {
  if (!source) {
    return Prisma.sql``;
  }
  return Prisma.sql`AND source = ${source}`;
}
