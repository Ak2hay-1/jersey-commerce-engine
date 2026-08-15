import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@ApiTags('expenses')
@TenantScoped()
@RequirePermissions('reports.read')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List expense categories for the current tenant' })
  findCategories(@TenantId() tenantId: string) {
    return this.expensesService.findCategories(tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.expensesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.expensesService.findById(tenantId, id);
  }
}
