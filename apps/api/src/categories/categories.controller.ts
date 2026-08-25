import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { IMAGE_MAX_BYTES } from '../storage/image-validation';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category-mutations.dto';

function assertCategoryImagePermission(actor: AuthPrincipal): void {
  if (!actor.permissions.includes('categories.update') && !actor.permissions.includes('categories.create')) {
    throw new ForbiddenException('You do not have permission to perform this action.');
  }
}

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

  @Post(':id/image')
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
  @ApiOperation({ summary: 'Upload a category image to VM storage. JPEG, PNG, and WEBP up to 5MB.' })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; size: number; mimetype?: string } | undefined,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    assertCategoryImagePermission(actor);
    return this.categories.uploadImage(id, file, actor);
  }

  @Delete(':id/image')
  @RequirePermissions('categories.update')
  @ApiOperation({ summary: 'Clear the category image and delete the local file when it is store media.' })
  deleteImage(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.categories.deleteImage(id, actor);
  }
}
