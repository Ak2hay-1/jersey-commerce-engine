import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, ExpenseQueryDto, UpdateExpenseDto, VoidExpenseDto } from './dto/expense.dto';

@Controller('expenses')
@ApiTags('expenses')
@ApiBearerAuth('access-token')
@TenantScoped()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'List expense categories for the current tenant' })
  findCategories(@TenantId() tenantId: string) {
    return this.expensesService.findCategories(tenantId);
  }

  @Get()
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'List expenses for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(tenantId, query);
  }

  @Post()
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Record an operating expense' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreateExpenseDto, @Req() request: Request) {
    return this.expensesService.create(actor, dto, requestMeta(request));
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Get an expense by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.expensesService.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update an active expense. Voided expenses cannot be rewritten.' })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() request: Request,
  ) {
    return this.expensesService.update(actor, id, dto, requestMeta(request));
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  @ApiOperation({ summary: 'Void an expense. Historical financial records are never deleted.' })
  remove(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: VoidExpenseDto,
    @Req() request: Request,
  ) {
    return this.expensesService.void(actor, id, dto, requestMeta(request));
  }
}
