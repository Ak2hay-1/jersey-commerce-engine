import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateProductImageDto,
  ProductVariantInputDto,
  UpdateProductDto,
  UpdateProductImageDto,
} from './dto/product-mutations.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { IMAGE_MAX_BYTES } from '../storage/image-validation';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @RequirePermissions('products.create')
  @ApiOperation({ summary: 'Create a product with one or more variants' })
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthPrincipal) {
    return this.products.create(dto, actor);
  }

  @Get()
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Search, filter, sort, and paginate products for the current tenant' })
  findAll(@Query() query: ProductQueryDto) {
    return this.products.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get product detail including category, variants, images, and pricing' })
  findById(@Param('id') id: string) {
    return this.products.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Update product fields. Name changes do not rewrite the slug unless slug is sent.' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() actor: AuthPrincipal) {
    return this.products.update(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('products.delete')
  @ApiOperation({
    summary: 'Archive a product and deactivate its variants. Historical sales, purchases, and inventory are preserved.',
  })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.products.remove(id, actor);
  }

  @Post(':id/variants')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Add a variant (size, colour, SKU, barcode, and prices) to a product' })
  createVariant(
    @Param('id') id: string,
    @Body() dto: ProductVariantInputDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.createVariant(id, dto, actor);
  }

  @Patch(':id/variants/:variantId')
  @RequirePermissions('products.update')
  @ApiOperation({
    summary: 'Update a variant. Changing selling or cost price does not rewrite historical transaction prices.',
  })
  updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: ProductVariantInputDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.updateVariant(id, variantId, dto, actor);
  }

  @Delete(':id/variants/:variantId')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Archive a variant, or delete it only when it has no historical transactions' })
  archiveVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.archiveVariant(id, variantId, actor);
  }

  @Post(':id/images')
  @RequirePermissions('products.update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ type: CreateProductImageDto })
  @ApiOperation({ summary: 'Add a product image via upload or URL. JPEG, PNG, and WEBP up to 5MB.' })
  addImage(
    @Param('id') id: string,
    @Body() dto: CreateProductImageDto,
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype?: string } | undefined,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.addImage(id, dto, file, actor);
  }

  @Patch(':id/images/:imageId')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Update image alt text, sort order, or primary flag' })
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.updateImage(id, imageId, dto, actor);
  }

  @Delete(':id/images/:imageId')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Delete a product image. Binary files are removed from object storage, not PostgreSQL.' })
  deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.products.deleteImage(id, imageId, actor);
  }
}
