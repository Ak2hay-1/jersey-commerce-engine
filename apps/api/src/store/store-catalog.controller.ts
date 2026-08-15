import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { StoreCatalogService } from './store-catalog.service';
import { StoreCatalogQueryDto } from './dto/store-catalog-query.dto';

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreCatalogController {
  constructor(private readonly catalog: StoreCatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List published products with server-side filters, sorting, and pagination' })
  listProducts(@TenantId() tenantId: string, @Query() query: StoreCatalogQueryDto) {
    return this.catalog.listProducts(tenantId, query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get a published product by slug, including variant availability and related products' })
  getProduct(@TenantId() tenantId: string, @Param('slug') slug: string) {
    return this.catalog.getProductBySlug(tenantId, slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List published categories for the current tenant' })
  listCategories(@TenantId() tenantId: string) {
    return this.catalog.listCategories(tenantId);
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'Get a published category by slug. Nested paths are verified when slugPath is sent.' })
  getCategory(
    @TenantId() tenantId: string,
    @Param('slug') slug: string,
    @Query('slugPath') slugPath?: string,
  ) {
    const path = slugPath
      ? slugPath.split('/').filter(Boolean)
      : slug.split('/').filter(Boolean);
    return this.catalog.getCategoryByPath(tenantId, path);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search published products and categories' })
  search(@TenantId() tenantId: string, @Query() query: StoreCatalogQueryDto) {
    return this.catalog.search(tenantId, query);
  }

  @Get('collections/featured')
  @ApiOperation({ summary: 'Featured products for homepage merchandising' })
  featured(@TenantId() tenantId: string) {
    return this.catalog.featured(tenantId);
  }

  @Get('collections/new')
  @ApiOperation({ summary: 'Newest published products' })
  newest(@TenantId() tenantId: string) {
    return this.catalog.newest(tenantId);
  }

  @Get('collections/best-sellers')
  @ApiOperation({ summary: 'Best sellers from order history, falling back to featured products' })
  bestSellers(@TenantId() tenantId: string) {
    return this.catalog.bestSellers(tenantId);
  }
}
