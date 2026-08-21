import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto, GeneratePromoCodeDto, PromoCodeQueryDto, UpdatePromoCodeDto } from './dto/promo-code.dto';

@Controller('promo-codes')
@ApiTags('promo-codes')
@ApiBearerAuth('access-token')
@TenantScoped()
export class PromoCodesController {
  constructor(private readonly promoCodes: PromoCodesService) {}

  @Get()
  @RequirePermissions('promoCodes.read')
  @ApiOperation({ summary: 'List promo codes for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: PromoCodeQueryDto) {
    return this.promoCodes.findAll(tenantId, query);
  }

  @Post('generate')
  @RequirePermissions('promoCodes.manage')
  @ApiOperation({ summary: 'Generate a unique promo code value without saving it' })
  generate(@Body() dto: GeneratePromoCodeDto) {
    return this.promoCodes.generate(dto.prefix);
  }

  @Post()
  @RequirePermissions('promoCodes.manage')
  @ApiOperation({ summary: 'Create a storefront promo code. Leave code empty to auto-generate one.' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreatePromoCodeDto, @Req() request: Request) {
    return this.promoCodes.create(actor, dto, requestMeta(request));
  }

  @Get(':id')
  @RequirePermissions('promoCodes.read')
  @ApiOperation({ summary: 'Get a promo code by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.promoCodes.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('promoCodes.manage')
  @ApiOperation({ summary: 'Update or disable a promo code' })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeDto,
    @Req() request: Request,
  ) {
    return this.promoCodes.update(actor, id, dto, requestMeta(request));
  }
}
