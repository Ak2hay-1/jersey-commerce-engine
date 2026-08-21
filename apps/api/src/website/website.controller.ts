import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { IMAGE_MAX_BYTES } from '../storage/image-validation';
import { UpdateWebsiteSettingsDto } from './dto/website-mutations.dto';
import { WebsiteService } from './website.service';

@Controller('website')
@ApiTags('website')
@TenantScoped()
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get('settings')
  @RequirePermissions('website.read')
  @ApiOperation({ summary: 'Get website settings for the current tenant' })
  getSettings(@TenantId() tenantId: string) {
    return this.websiteService.getSettings(tenantId);
  }

  @Patch('settings')
  @RequirePermissions('website.update')
  @ApiOperation({ summary: 'Update storefront homepage, SEO, and contact settings' })
  updateSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateWebsiteSettingsDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.websiteService.updateSettings(tenantId, dto, actor);
  }

  @Post('media')
  @RequirePermissions('website.update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload a homepage banner or collection tile image. JPEG, PNG, and WEBP up to 5MB.',
  })
  uploadMedia(
    @TenantId() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype?: string } | undefined,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.websiteService.uploadMedia(tenantId, file, actor);
  }
}
