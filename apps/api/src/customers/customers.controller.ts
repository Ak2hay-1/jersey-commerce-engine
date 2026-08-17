import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { CustomersService } from './customers.service';
import {
  AssignCustomerTagDto,
  CreateCustomerDto,
  CreateCustomerNoteDto,
  UpdateCustomerDto,
} from './dto/customer-mutations.dto';
import { CustomerHistoryQueryDto, CustomerQueryDto, CustomerReportQueryDto } from './dto/customer-query.dto';

@Controller('customers')
@ApiTags('customers')
@TenantScoped()
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Search customers by name, phone, or email' })
  findAll(@TenantId() tenantId: string, @Query() query: CustomerQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get('summary')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'CRM dashboard totals for the current tenant' })
  dashboard(@TenantId() tenantId: string, @Query() query: CustomerReportQueryDto) {
    return this.service.dashboard(tenantId, query);
  }

  @Get('top')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Top customers by spending or completed purchase count' })
  top(@TenantId() tenantId: string, @Query() query: CustomerReportQueryDto) {
    return this.service.top(tenantId, query);
  }

  @Get('repeat')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Customers with two or more completed purchases' })
  repeat(@TenantId() tenantId: string, @Query() query: CustomerReportQueryDto) {
    return this.service.repeat(tenantId, query);
  }

  @Get('inactive')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Customers with no completed purchase for the configured inactivity period' })
  inactive(@TenantId() tenantId: string, @Query() query: CustomerReportQueryDto) {
    return this.service.inactive(tenantId, query);
  }

  @Get('tags')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'List reusable customer tags for the current tenant' })
  listTags(@TenantId() tenantId: string) {
    return this.service.listTags(tenantId);
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Customer profile with derived spend, segments, tags, and preferences' })
  findById(@TenantId() tenantId: string, @Param('id') id: string, @Query() query: CustomerReportQueryDto) {
    return this.service.getProfile(tenantId, id, query);
  }

  @Get(':id/history')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Paginated POS sales and orders for a customer' })
  history(@TenantId() tenantId: string, @Param('id') id: string, @Query() query: CustomerHistoryQueryDto) {
    return this.service.history(tenantId, id, query);
  }

  @Get(':id/activity')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Customer activity timeline derived from sales, orders, notes, and tags' })
  activity(@TenantId() tenantId: string, @Param('id') id: string, @Query() query: CustomerHistoryQueryDto) {
    return this.service.activity(tenantId, id, query);
  }

  @Get(':id/summary')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Derived spend metrics and segments for one customer' })
  summary(@TenantId() tenantId: string, @Param('id') id: string, @Query() query: CustomerReportQueryDto) {
    return this.service.summary(tenantId, id, query);
  }

  @Post()
  @RequirePermissions('customers.create')
  @ApiOperation({ summary: 'Create a tenant-scoped customer. Possible phone/email matches return 409 unless allowDuplicate is true.' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.create(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('customers.update')
  @ApiOperation({ summary: 'Update customer profile, address, status, or communication preferences' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.update(tenantId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('customers.delete')
  @ApiOperation({
    summary: 'Delete a customer with no history, or deactivate a customer who has sales or orders',
  })
  remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.service.remove(tenantId, id, actor);
  }

  @Get(':id/notes')
  @RequirePermissions('customers.notes')
  @ApiOperation({ summary: 'List internal staff notes. Not exposed on the storefront.' })
  listNotes(@TenantId() tenantId: string, @Param('id') id: string, @Query() query: CustomerHistoryQueryDto) {
    return this.service.listNotes(tenantId, id, query);
  }

  @Post(':id/notes')
  @RequirePermissions('customers.notes')
  @ApiOperation({ summary: 'Add an internal staff note' })
  addNote(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerNoteDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.addNote(tenantId, id, dto.body, actor);
  }

  @Post(':id/tags')
  @RequirePermissions('customers.tags')
  @ApiOperation({ summary: 'Assign a reusable tag, creating it by name when needed' })
  assignTag(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignCustomerTagDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.assignTag(tenantId, id, dto, actor);
  }

  @Delete(':id/tags/:tagId')
  @RequirePermissions('customers.tags')
  @ApiOperation({ summary: 'Remove a tag assignment. The reusable tag remains available.' })
  removeTag(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.removeTag(tenantId, id, tagId, actor);
  }
}
