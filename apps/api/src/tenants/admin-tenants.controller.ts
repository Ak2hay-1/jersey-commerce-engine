import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BootstrapGuard } from './bootstrap.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { AdminTenantsService } from './admin-tenants.service';

@ApiTags('admin')
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly tenants: AdminTenantsService) {}

  @Public()
  @UseGuards(BootstrapGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a tenant and owner user (development / operations bootstrap only)',
  })
  @ApiHeader({ name: 'x-bootstrap-secret', required: true })
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.createForAdmin(dto);
  }
}
