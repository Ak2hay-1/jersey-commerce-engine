import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category-mutations.dto';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @RequirePermissions('categories.create')
  @ApiOperation({ summary: 'Create a category. parentId creates a subcategory.' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser() actor: AuthPrincipal) {
    return this.categories.create(dto, actor);
  }

  @Get()
  @RequirePermissions('categories.read')
  @ApiOperation({ summary: 'List paginated categories for the current tenant' })
  findAll(@Query() query: CategoryQueryDto) {
    return this.categories.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('categories.read')
  @ApiOperation({ summary: 'Get a category with parent, children, and product count' })
  findById(@Param('id') id: string) {
    return this.categories.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('categories.update')
  @ApiOperation({ summary: 'Update a category. Circular parent assignments are rejected.' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentUser() actor: AuthPrincipal) {
    return this.categories.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('categories.delete')
  @ApiOperation({
    summary: 'Delete an empty category. Categories with products or children must be archived or reassigned.',
  })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.categories.remove(id, actor);
  }

  @Post(':id/archive')
  @RequirePermissions('categories.update')
  @ApiOperation({ summary: 'Archive a category without deleting historical product relationships' })
  archive(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.categories.archive(id, actor);
  }
}
