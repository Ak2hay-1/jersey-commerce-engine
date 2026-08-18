import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { StoreTenantGuard } from '../store/store-tenant.guard';
import { CUSTOM_ORDER_FILE_MAX_BYTES, CUSTOM_ORDER_MAX_FILES } from './custom-order-files';
import { CustomOrdersService } from './custom-orders.service';
import { CustomOrderInquiryDto, DesignDecisionDto } from './dto/custom-order.dto';

@Controller('store/custom-orders')
@ApiTags('store-custom-orders')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
export class StoreCustomOrdersController {
  constructor(private readonly customOrders: CustomOrdersService) {}

  @Get('config')
  @ApiOperation({ summary: 'Public custom-order page config: theme and customization options' })
  config(@TenantId() tenantId: string) {
    return this.customOrders.getPublicConfig(tenantId);
  }

  @Post('inquiry')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseInterceptors(
    FilesInterceptor('files', CUSTOM_ORDER_MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: CUSTOM_ORDER_FILE_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Submit a guest custom-jersey enquiry. A customer account is not required.' })
  inquiry(
    @TenantId() tenantId: string,
    @Body() dto: CustomOrderInquiryDto,
    @UploadedFiles() files: Array<{ buffer: Buffer; size: number; originalname?: string; mimetype?: string }> | undefined,
    @Req() request: Request,
  ) {
    return this.customOrders.createInquiry(tenantId, dto, files, requestMeta(request));
  }

  @Get(':publicId/files/:fileId')
  @ApiOperation({ summary: 'Stream a reference or design file for a public custom order' })
  async file(@TenantId() tenantId: string, @Param('publicId') publicId: string, @Param('fileId') fileId: string) {
    const result = await this.customOrders.streamFile(tenantId, publicId, fileId, true);
    return result.stream;
  }

  @Get(':publicId')
  @ApiOperation({ summary: 'Load a public custom-order enquiry, quote, and design status' })
  getPublic(@TenantId() tenantId: string, @Param('publicId') publicId: string) {
    return this.customOrders.getPublic(tenantId, publicId);
  }

  @Post(':publicId/approve-design')
  @ApiOperation({ summary: 'Customer approves the latest design version' })
  approveDesign(
    @TenantId() tenantId: string,
    @Param('publicId') publicId: string,
    @Body() dto: DesignDecisionDto,
    @Req() request: Request,
  ) {
    return this.customOrders.decideDesignPublic(tenantId, publicId, 'APPROVE', dto, requestMeta(request));
  }

  @Post(':publicId/request-design-changes')
  @ApiOperation({ summary: 'Customer requests changes to the latest design version' })
  requestChanges(
    @TenantId() tenantId: string,
    @Param('publicId') publicId: string,
    @Body() dto: DesignDecisionDto,
    @Req() request: Request,
  ) {
    return this.customOrders.decideDesignPublic(tenantId, publicId, 'REQUEST_CHANGES', dto, requestMeta(request));
  }

  @Post(':publicId/accept-quote')
  @ApiOperation({ summary: 'Customer accepts the current quote. Expired or cancelled quotes are rejected.' })
  acceptQuote(@TenantId() tenantId: string, @Param('publicId') publicId: string, @Req() request: Request) {
    return this.customOrders.acceptQuote(tenantId, publicId, requestMeta(request));
  }
}
