import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';

@Injectable()
export class WebsiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    return assertFound(
      await this.prisma.websiteSettings.findUnique({ where: { tenantId } }),
      'Website settings not found',
    );
  }
}
