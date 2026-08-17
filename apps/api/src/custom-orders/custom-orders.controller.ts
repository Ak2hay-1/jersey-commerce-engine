import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { CUSTOM_ORDER_FILE_MAX_BYTES } from './custom-order-files';
import { CustomOrdersService } from './custom-orders.service';
import {
  CancelCustomOrderDto,
  CreateCustomOrderDto,
  CreateCustomOrderQuoteDto,
  CustomOrderNoteDto,
  CustomOrderQueryDto,
  RecordCustomOrderPaymentDto,
  StaffDesignDecisionDto,
  UpdateCustomOrderDto,
  UpdateCustomOrderStatusDto,
} from './dto/custom-order.dto';

@Controller('custom-orders')
@ApiTags('custom-orders')
@ApiBearerAuth('access-token')
@TenantScoped()
export class CustomOrdersController {
  constructor(private readonly customOrders: CustomOrdersService) {}

  @Get()
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'List tenant custom jersey orders' })
  findAll(@TenantId() tenantId: string, @Query() query: CustomOrderQueryDto) {
    return this.customOrders.findAll(tenantId, query);
  }

  @Post()
  @RequirePermissions('customOrders.create')
  @ApiOperation({ summary: 'Create a custom order from staff, associated with an existing or new customer' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreateCustomOrderDto, @Req() request: Request) {
    return this.customOrders.create(actor, dto, requestMeta(request));
  }

  @Get(':id')
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'Get a custom order with items, quotes, designs, and payments' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customOrders.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('customOrders.update')
  @ApiOperation({ summary: 'Update custom-order details, team items, or convert an enquiry' })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateCustomOrderDto,
    @Req() request: Request,
  ) {
    return this.customOrders.update(actor, id, dto, requestMeta(request));
  }

  @Post(':id/quote')
  @RequirePermissions('customOrders.quote')
  @ApiOperation({ summary: 'Create a new quote version. Historical quotes are retained.' })
  createQuote(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: CreateCustomOrderQuoteDto,
    @Req() request: Request,
  ) {
    return this.customOrders.createQuote(actor, id, dto, requestMeta(request));
  }

  @Post(':id/design')
  @RequirePermissions('customOrders.design')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CUSTOM_ORDER_FILE_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, notes: { type: 'string' } } } })
  @ApiOperation({ summary: 'Upload a new design version. Previous versions are not overwritten.' })
  uploadDesign(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; size: number; originalname?: string; mimetype?: string } | undefined,
    @Body() body: { notes?: string },
    @Req() request: Request,
  ) {
    return this.customOrders.uploadDesign(actor, id, file, body.notes, requestMeta(request));
  }

  @Post(':id/design/request-approval')
  @RequirePermissions('customOrders.design')
  @ApiOperation({ summary: 'Ask the customer to approve the latest design version' })
  requestApproval(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Req() request: Request) {
    return this.customOrders.requestDesignApproval(actor, id, requestMeta(request));
  }

  @Post(':id/approve')
  @RequirePermissions('customOrders.approve')
  @ApiOperation({ summary: 'Record a staff design approval or change request' })
  approve(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: StaffDesignDecisionDto,
    @Req() request: Request,
  ) {
    return this.customOrders.decideDesignStaff(actor, id, dto, requestMeta(request));
  }

  @Post(':id/deposit')
  @RequirePermissions('customOrders.payment')
  @ApiOperation({ summary: 'Record a deposit or balance payment. Does not mark the order paid unless the balance is cleared.' })
  deposit(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: RecordCustomOrderPaymentDto,
    @Req() request: Request,
  ) {
    return this.customOrders.recordPayment(actor, id, dto, requestMeta(request));
  }

  @Patch(':id/status')
  @RequirePermissions('customOrders.production')
  @ApiOperation({ summary: 'Advance custom-order or production status through the allowed state machine' })
  updateStatus(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateCustomOrderStatusDto,
    @Req() request: Request,
  ) {
    return this.customOrders.updateStatus(actor, id, dto, requestMeta(request));
  }

  @Post(':id/cancel')
  @RequirePermissions('customOrders.update')
  @ApiOperation({ summary: 'Cancel a custom order and release any reserved catalog stock' })
  cancel(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: CancelCustomOrderDto,
    @Req() request: Request,
  ) {
    return this.customOrders.cancel(actor, id, dto, requestMeta(request));
  }

  @Get(':id/timeline')
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'Read the append-only custom-order timeline' })
  timeline(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customOrders.listTimeline(tenantId, id);
  }

  @Get(':id/notes')
  @RequirePermissions('customOrders.production')
  @ApiOperation({ summary: 'List internal production notes' })
  notes(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customOrders.listNotes(tenantId, id);
  }

  @Post(':id/notes')
  @RequirePermissions('customOrders.production')
  @ApiOperation({ summary: 'Add an internal production note' })
  addNote(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: CustomOrderNoteDto) {
    return this.customOrders.addNote(actor, id, dto);
  }

  @Get(':id/files/:fileId')
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'Stream a private design or reference file' })
  async file(@TenantId() tenantId: string, @Param('id') id: string, @Param('fileId') fileId: string) {
    const result = await this.customOrders.streamFile(tenantId, id, fileId);
    return result.stream;
  }
}
