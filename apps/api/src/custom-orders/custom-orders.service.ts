import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import {
  CUSTOM_ORDER_COMMUNICATION_TYPES,
  CUSTOM_ORDER_TYPES,
  type CustomOrderCommunicationType,
  type CustomOrderStatus,
} from '@jersey-commerce/types';
import { InventoryMovementType, Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { DOCUMENT_TYPES, nextDocumentNumber } from '../documents/document-sequence';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { LocalObjectStorage } from '../storage/local-storage.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/storage.types';
import { money, roundMoney } from '../pos/pos-money';
import { moneyString } from '../catalog/money';
import {
  assertCustomOrderTransition,
  assertProductionTransition,
  isCancellableCustomOrderStatus,
} from './custom-order-state-machine';
import { computeCustomizationCharge, computeQuoteTotals, derivePaymentState } from './custom-order-quote';
import { deriveOrderingMode, normalizeCustomOrderItems, totalItemQuantity } from './custom-order-items';
import {
  CUSTOM_ORDER_MAX_FILES,
  customOrderStorageKey,
  sanitizeOriginalFilename,
  type UploadedCustomOrderFile,
  validateCustomOrderFile,
} from './custom-order-files';
import { toDetail, toPublic, toSummary } from './custom-order.mapper';
import type {
  CancelCustomOrderDto,
  CreateCustomOrderDto,
  CreateCustomOrderQuoteDto,
  CustomizationOptionDto,
  CustomOrderInquiryDto,
  CustomOrderNoteDto,
  CustomOrderQueryDto,
  DesignDecisionDto,
  RecordCustomOrderPaymentDto,
  StaffDesignDecisionDto,
  UpdateCustomOrderDto,
  UpdateCustomOrderStatusDto,
} from './dto/custom-order.dto';

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  items: { orderBy: { createdAt: 'asc' as const } },
  quotes: { orderBy: { version: 'desc' as const } },
  designs: { include: { file: true }, orderBy: { version: 'desc' as const } },
  files: { orderBy: { uploadedAt: 'asc' as const } },
  payments: { where: { status: { in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } }, orderBy: { createdAt: 'asc' as const } },
  customizations: { orderBy: { createdAt: 'asc' as const } },
  acceptedQuote: true,
  timeline: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.CustomOrderInclude;

type LoadedCustomOrder = Prisma.CustomOrderGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentsService,
    private readonly processor: PaymentProcessor,
    private readonly localStorage: LocalObjectStorage,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async findAll(tenantId: string, query: CustomOrderQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const search = query.search?.trim();
    const where: Prisma.CustomOrderWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { teamName: { contains: search, mode: 'insensitive' } },
              { customer: { is: { name: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.customOrder.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customOrder.count({ where }),
    ]);
    return { items: records.map(toSummary), meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return toDetail(await this.load(tenantId, id));
  }

  async getPublic(tenantId: string, publicId: string) {
    return toPublic(await this.loadByPublicId(tenantId, publicId));
  }

  async getPublicConfig(tenantId: string) {
    const tenant = await this.prisma.withoutTenantScope(() =>
      this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { websiteSettings: true } }),
    );
    const options = await this.prisma.customizationOption.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return {
      tenant: { slug: tenant?.slug ?? '', name: tenant?.name ?? '', currency: tenant?.currency ?? 'INR' },
      theme: {
        primaryColor: tenant?.websiteSettings?.primaryColor ?? tenant?.primaryColor ?? null,
        secondaryColor: tenant?.websiteSettings?.secondaryColor ?? tenant?.secondaryColor ?? null,
        accentColor: tenant?.websiteSettings?.accentColor ?? null,
        backgroundColor: tenant?.websiteSettings?.backgroundColor ?? null,
        foregroundColor: tenant?.websiteSettings?.foregroundColor ?? null,
        logo: tenant?.websiteSettings?.logo ?? tenant?.logo ?? null,
      },
      customizationOptions: options.map((option) => ({
        id: option.id,
        name: option.name,
        description: option.description,
        pricingType: option.pricingType,
        price: moneyString(option.price) ?? '0.00',
        status: option.status,
        sortOrder: option.sortOrder,
      })),
      types: [...CUSTOM_ORDER_TYPES],
    };
  }

  async createInquiry(
    tenantId: string,
    dto: CustomOrderInquiryDto,
    files: UploadedCustomOrderFile[] | undefined,
    meta?: RequestMeta,
  ) {
    this.assertInquiryContact(dto);
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.customers.resolveForOrder(
        tenantId,
        { name: dto.name, phone: dto.phone, email: dto.email },
        undefined,
        tx,
      );
      const created = await this.createOrderRecord(tx, tenantId, customer.id, dto, undefined);
      await this.storeFiles(tx, tenantId, created.id, files, undefined, 'REFERENCE');
      await this.appendTimeline(tx, tenantId, created.id, 'INQUIRY_RECEIVED', 'Inquiry received', dto.teamName, undefined);
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_ENQUIRY_CREATED,
          tenantId,
          entity: 'CustomOrder',
          entityId: created.id,
          metadata: { orderNumber: created.orderNumber, customerId: customer.id },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toPublic(await this.loadById(tx, tenantId, created.id));
    });
  }

  async create(actor: AuthPrincipal, dto: CreateCustomOrderDto, meta?: RequestMeta) {
    this.assertInquiryContact(dto);
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.customers.resolveForOrder(
        actor.tenantId,
        { customerId: dto.customerId, name: dto.name, phone: dto.phone, email: dto.email },
        actor,
        tx,
      );
      const created = await this.createOrderRecord(tx, actor.tenantId, customer.id, dto, actor.userId);
      if (dto.items?.length) {
        await this.replaceItems(tx, actor.tenantId, created.id, dto.items);
      }
      if (dto.customizationOptionIds?.length) {
        await this.replaceCustomizations(tx, actor.tenantId, created.id, dto.customizationOptionIds);
      }
      await this.appendTimeline(tx, actor.tenantId, created.id, 'CUSTOM_ORDER_CREATED', 'Custom order created', dto.teamName, actor.userId);
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_CREATED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrder',
          entityId: created.id,
          metadata: { orderNumber: created.orderNumber },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, created.id));
    });
  }

  async update(actor: AuthPrincipal, id: string, dto: UpdateCustomOrderDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
        throw new ConflictException('Completed or cancelled custom orders cannot be updated.');
      }
      await asTx(tx).customOrder.update({
        where: { id: existing.id },
        data: {
          type: dto.type ?? existing.type,
          teamName: dto.teamName?.trim() ?? existing.teamName,
          description: dto.description?.trim() ?? existing.description,
          preferredJerseyType: dto.preferredJerseyType?.trim() ?? existing.preferredJerseyType,
          preferredColours: dto.preferredColours?.trim() ?? existing.preferredColours,
          customizationRequirements: dto.customizationRequirements?.trim() ?? existing.customizationRequirements,
          requestedDeliveryDate: dto.requestedDeliveryDate
            ? this.parseDate(dto.requestedDeliveryDate, 'requestedDeliveryDate')
            : existing.requestedDeliveryDate,
          notes: dto.notes?.trim() ?? existing.notes,
        },
      });
      if (dto.items) {
        await this.replaceItems(tx, actor.tenantId, existing.id, dto.items);
      }
      if (dto.customizationOptionIds) {
        await this.replaceCustomizations(tx, actor.tenantId, existing.id, dto.customizationOptionIds);
      }
      if (existing.status === 'INQUIRY' && (dto.items?.length || dto.type)) {
        await this.transition(tx, existing, 'QUOTATION', actor.userId, 'Converted enquiry to custom order');
      }
      if (dto.reserveInventory && ['CONFIRMED', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'PRODUCTION'].includes(existing.status)) {
        await this.reserveVariantStock(tx, actor, existing.id, meta);
      }
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_UPDATED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrder',
          entityId: existing.id,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async createQuote(actor: AuthPrincipal, id: string, dto: CreateCustomOrderQuoteDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (['CANCELLED', 'COMPLETED'].includes(existing.status)) {
        throw new ConflictException('Cannot quote a completed or cancelled order.');
      }
      const quantity = dto.quantity ?? existing.estimatedQuantity;
      if (quantity < 1) {
        throw new BadRequestException('Quote quantity must be at least 1.');
      }
      const customizationCharges =
        dto.customizationCharges ??
        (await this.computeSelectedCustomizationCharges(tx, actor.tenantId, existing.id, quantity)).toFixed(2);
      const totals = computeQuoteTotals({
        unitPrice: dto.unitPrice,
        quantity,
        customizationCharges,
        discount: dto.discount,
        tax: dto.tax,
        shippingAmount: dto.shippingAmount,
        depositRequired: dto.depositRequired,
      });
      const current = existing.quotes.find((quote) => quote.isCurrent);
      const quoteNumber = current?.quoteNumber ?? (await nextDocumentNumber(tx, actor.tenantId, DOCUMENT_TYPES.CUSTOM_ORDER_QUOTE));
      const version = (current?.version ?? 0) + 1;
      if (current) {
        await asTx(tx).customOrderQuote.update({
          where: { id: current.id },
          data: { isCurrent: false, acceptanceState: 'SUPERSEDED' },
        });
      }
      const quote = await asTx(tx).customOrderQuote.create({
        data: {
          tenantId: actor.tenantId,
          customOrderId: existing.id,
          quoteNumber,
          version,
          isCurrent: true,
          unitPrice: totals.unitPrice,
          quantity: totals.quantity,
          customizationCharges: totals.customizationCharges,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          shippingAmount: totals.shippingAmount,
          total: totals.total,
          depositRequired: totals.depositRequired,
          estimatedCompletionDate: dto.estimatedCompletionDate
            ? this.parseDate(dto.estimatedCompletionDate, 'estimatedCompletionDate')
            : null,
          expiresAt: dto.expiresAt ? this.parseDate(dto.expiresAt, 'expiresAt') : null,
          notes: dto.notes?.trim() || null,
          createdById: actor.userId,
        },
      });
      await asTx(tx).customOrder.update({
        where: { id: existing.id },
        data: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          shippingAmount: totals.shippingAmount,
          total: totals.total,
          depositRequired: totals.depositRequired,
          balanceDue: roundMoney(totals.total.sub(money(existing.depositPaid.toString()))),
        },
      });
      if (existing.status === 'INQUIRY') {
        await this.transition(tx, existing, 'QUOTATION', actor.userId, `Quote ${quoteNumber} created`);
      }
      await this.communicate(tx, actor.tenantId, existing.id, 'QUOTE_CREATED', { quoteId: quote.id, version });
      await this.appendTimeline(tx, actor.tenantId, existing.id, 'QUOTE_CREATED', `Quote ${quoteNumber} v${version} created`, null, actor.userId);
      if (dto.send) {
        const afterQuote = await this.loadById(tx, actor.tenantId, existing.id);
        if (afterQuote.status === 'QUOTATION' || afterQuote.status === 'INQUIRY') {
          await this.transition(tx, afterQuote, 'QUOTE_SENT', actor.userId, 'Quote sent');
        }
        await this.communicate(tx, actor.tenantId, existing.id, 'QUOTE_SENT', { quoteId: quote.id, version });
      }
      await this.audit.log(
        {
          action: current ? AUDIT_ACTIONS.CUSTOM_ORDER_QUOTE_CHANGED : AUDIT_ACTIONS.CUSTOM_ORDER_QUOTE_CREATED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrderQuote',
          entityId: quote.id,
          metadata: { customOrderId: existing.id, quoteNumber, version, total: totals.total.toFixed(2) },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async acceptQuote(tenantId: string, publicId: string, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadByPublicIdTx(tx, tenantId, publicId);
      const quote = existing.quotes.find((row) => row.isCurrent);
      if (!quote) {
        throw new BadRequestException('No current quote is available to accept.');
      }
      this.assertQuoteAcceptable(quote);
      const nextStatus: CustomOrderStatus = quote.depositRequired.gt(0) ? 'DEPOSIT_PENDING' : 'CONFIRMED';
      await asTx(tx).customOrderQuote.update({
        where: { id: quote.id },
        data: {
          acceptanceState: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByCustomerId: existing.customerId,
        },
      });
      await asTx(tx).customOrder.update({
        where: { id: existing.id },
        data: {
          acceptedQuoteId: quote.id,
          subtotal: quote.subtotal,
          discount: quote.discount,
          tax: quote.tax,
          shippingAmount: quote.shippingAmount,
          total: quote.total,
          depositRequired: quote.depositRequired,
          balanceDue: roundMoney(quote.total.sub(money(existing.depositPaid.toString()))),
        },
      });
      const reloaded = await this.loadById(tx, tenantId, existing.id);
      await this.transition(tx, reloaded, nextStatus, undefined, `Quote ${quote.quoteNumber} accepted`);
      if (nextStatus === 'CONFIRMED') {
        await this.communicate(tx, tenantId, existing.id, 'ORDER_CONFIRMED', { quoteId: quote.id });
      }
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_QUOTE_ACCEPTED,
          tenantId,
          entity: 'CustomOrderQuote',
          entityId: quote.id,
          metadata: { customOrderId: existing.id, version: quote.version },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toPublic(await this.loadById(tx, tenantId, existing.id));
    });
  }

  async uploadDesign(
    actor: AuthPrincipal,
    id: string,
    file: UploadedCustomOrderFile | undefined,
    notes: string | undefined,
    meta?: RequestMeta,
  ) {
    if (!file) {
      throw new BadRequestException('A design file is required.');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (['CANCELLED', 'COMPLETED'].includes(existing.status)) {
        throw new ConflictException('Cannot upload a design for a completed or cancelled order.');
      }
      const stored = await this.storeFiles(tx, actor.tenantId, existing.id, [file], actor.userId, 'DESIGN');
      const uploaded = stored[0];
      if (!uploaded) {
        throw new BadRequestException('Design file was not stored.');
      }
      const version = (existing.designs[0]?.version ?? 0) + 1;
      await asTx(tx).customOrderDesign.create({
        data: {
          tenantId: actor.tenantId,
          customOrderId: existing.id,
          fileId: uploaded.id,
          version,
          notes: notes?.trim() || null,
          createdById: actor.userId,
        },
      });
      if (existing.status === 'CONFIRMED') {
        await this.transition(tx, existing, 'DESIGN_PENDING', actor.userId, `Design v${version} uploaded`);
      }
      await this.communicate(tx, actor.tenantId, existing.id, 'DESIGN_READY', { version });
      await this.appendTimeline(tx, actor.tenantId, existing.id, 'DESIGN_UPLOADED', `Design v${version} uploaded`, notes, actor.userId);
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_DESIGN_UPLOADED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrder',
          entityId: existing.id,
          metadata: { version },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async requestDesignApproval(actor: AuthPrincipal, id: string, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      const latest = existing.designs[0];
      if (!latest) {
        throw new BadRequestException('Upload a design before requesting approval.');
      }
      if (latest.approvalStatus === 'APPROVED') {
        throw new ConflictException('The latest design is already approved.');
      }
      if (existing.status === 'CONFIRMED' || existing.status === 'DESIGN_PENDING') {
        await this.transition(tx, existing, 'DESIGN_APPROVAL', actor.userId, 'Design approval requested');
      }
      await this.communicate(tx, actor.tenantId, existing.id, 'DESIGN_APPROVAL_REQUIRED', {
        designId: latest.id,
        version: latest.version,
      });
      await this.appendTimeline(
        tx,
        actor.tenantId,
        existing.id,
        'DESIGN_APPROVAL_REQUESTED',
        `Approval requested for design v${latest.version}`,
        null,
        actor.userId,
      );
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_DESIGN_APPROVAL_REQUESTED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrderDesign',
          entityId: latest.id,
          metadata: { customOrderId: existing.id, version: latest.version },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async decideDesignPublic(
    tenantId: string,
    publicId: string,
    decision: 'APPROVE' | 'REQUEST_CHANGES',
    dto: DesignDecisionDto,
    meta?: RequestMeta,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadByPublicIdTx(tx, tenantId, publicId);
      await this.recordDesignDecision(
        tx,
        existing,
        decision,
        dto.comment,
        { isCustomer: true, customerId: existing.customerId },
        meta,
      );
      return toPublic(await this.loadById(tx, tenantId, existing.id));
    });
  }

  async decideDesignStaff(actor: AuthPrincipal, id: string, dto: StaffDesignDecisionDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      await this.recordDesignDecision(
        tx,
        existing,
        dto.decision ?? 'APPROVE',
        dto.comment,
        { isCustomer: false, userId: actor.userId },
        meta,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async recordPayment(actor: AuthPrincipal, id: string, dto: RecordCustomOrderPaymentDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (existing.status === 'CANCELLED') {
        throw new ConflictException('Cannot record a payment on a cancelled custom order.');
      }
      const billed = roundMoney(money(dto.amount));
      if (billed.lte(0)) {
        throw new BadRequestException('Payment amount must be greater than zero.');
      }
      const outstanding = roundMoney(money(existing.total.toString()).sub(this.paidTotal(existing)));
      if (billed.gt(outstanding)) {
        throw new BadRequestException('Payment exceeds the remaining balance.');
      }
      const prepared = this.processor.prepareCapture({
        method: dto.method,
        amount: billed,
        amountReceived: dto.amountReceived,
        reference: dto.reference,
        confirmed: dto.confirmed ?? (dto.method === 'CASH' ? true : dto.confirmed),
        metadata: {
          purpose: dto.purpose ?? (existing.status === 'DEPOSIT_PENDING' ? 'DEPOSIT' : 'BALANCE'),
          customOrderId: existing.id,
        },
      });
      await this.payments.persist(tx, {
        tenantId: actor.tenantId,
        saleId: null,
        orderId: null,
        customOrderId: existing.id,
        posSessionId: null,
        createdById: actor.userId,
        payments: [prepared],
      });
      const paidAfter = roundMoney(this.paidTotal(existing).add(billed));
      const depositRequired = money(existing.depositRequired.toString());
      const previousDeposit = money(existing.depositPaid.toString());
      const appliesToDeposit = existing.status === 'DEPOSIT_PENDING' || dto.purpose === 'DEPOSIT';
      const candidateDeposit = roundMoney(previousDeposit.add(billed));
      const depositPaid = appliesToDeposit
        ? candidateDeposit.gt(depositRequired)
          ? depositRequired
          : candidateDeposit
        : previousDeposit;
      const paymentStatus = derivePaymentState({
        total: money(existing.total.toString()),
        paid: paidAfter,
        depositRequired,
        depositPaid,
      });
      await asTx(tx).customOrder.update({
        where: { id: existing.id },
        data: {
          depositPaid,
          balanceDue: roundMoney(money(existing.total.toString()).sub(paidAfter)),
          paymentStatus,
        },
      });
      const isDeposit = paymentStatus === 'DEPOSIT_RECEIVED' || dto.purpose === 'DEPOSIT' || existing.status === 'DEPOSIT_PENDING';
      if (isDeposit) {
        await this.appendTimeline(tx, actor.tenantId, existing.id, 'DEPOSIT_RECEIVED', 'Deposit received', billed.toFixed(2), actor.userId);
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.CUSTOM_ORDER_DEPOSIT_RECEIVED,
            tenantId: actor.tenantId,
            userId: actor.userId,
            entity: 'CustomOrder',
            entityId: existing.id,
            metadata: { amount: billed.toFixed(2), method: dto.method },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
          tx,
        );
      }
      if (paymentStatus === 'PAID') {
        await this.appendTimeline(tx, actor.tenantId, existing.id, 'FINAL_PAYMENT', 'Final payment received', billed.toFixed(2), actor.userId);
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.CUSTOM_ORDER_FINAL_PAYMENT,
            tenantId: actor.tenantId,
            userId: actor.userId,
            entity: 'CustomOrder',
            entityId: existing.id,
            metadata: { amount: billed.toFixed(2), method: dto.method },
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
          },
          tx,
        );
      }
      const updated = await this.loadById(tx, actor.tenantId, existing.id);
      if (updated.status === 'DEPOSIT_PENDING' && depositPaid.gte(depositRequired) && depositRequired.gt(0)) {
        await this.transition(tx, updated, 'CONFIRMED', actor.userId, 'Deposit requirement met');
        await this.communicate(tx, actor.tenantId, existing.id, 'ORDER_CONFIRMED', {});
      }
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async updateStatus(actor: AuthPrincipal, id: string, dto: UpdateCustomOrderStatusDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (dto.status) {
        await this.transition(tx, existing, dto.status, actor.userId, dto.note);
        if (dto.status === 'PRODUCTION') {
          await asTx(tx).customOrder.update({
            where: { id: existing.id },
            data: { productionStatus: dto.productionStatus ?? 'PRODUCTION' },
          });
          await asTx(tx).customOrderProductionEvent.create({
            data: {
              tenantId: actor.tenantId,
              customOrderId: existing.id,
              status: dto.productionStatus ?? 'PRODUCTION',
              note: dto.note?.trim() || null,
              createdById: actor.userId,
            },
          });
          await this.communicate(tx, actor.tenantId, existing.id, 'PRODUCTION_STARTED', {});
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.CUSTOM_ORDER_PRODUCTION_STARTED,
              tenantId: actor.tenantId,
              userId: actor.userId,
              entity: 'CustomOrder',
              entityId: existing.id,
              ipAddress: meta?.ipAddress,
              userAgent: meta?.userAgent,
            },
            tx,
          );
        }
        if (dto.status === 'READY') {
          await asTx(tx).customOrder.update({ where: { id: existing.id }, data: { productionStatus: 'READY' } });
          await this.communicate(tx, actor.tenantId, existing.id, 'READY_FOR_PICKUP', {});
        }
        if (dto.status === 'COMPLETED') {
          await this.consumeVariantStock(tx, actor, existing.id, meta);
          await this.communicate(tx, actor.tenantId, existing.id, 'ORDER_COMPLETED', {});
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.CUSTOM_ORDER_COMPLETED,
              tenantId: actor.tenantId,
              userId: actor.userId,
              entity: 'CustomOrder',
              entityId: existing.id,
              ipAddress: meta?.ipAddress,
              userAgent: meta?.userAgent,
            },
            tx,
          );
        }
      }
      if (dto.productionStatus && !dto.status) {
        assertProductionTransition(existing.productionStatus, dto.productionStatus);
        await asTx(tx).customOrder.update({ where: { id: existing.id }, data: { productionStatus: dto.productionStatus } });
        await asTx(tx).customOrderProductionEvent.create({
          data: {
            tenantId: actor.tenantId,
            customOrderId: existing.id,
            status: dto.productionStatus,
            note: dto.note?.trim() || null,
            createdById: actor.userId,
          },
        });
        await this.appendTimeline(
          tx,
          actor.tenantId,
          existing.id,
          'PRODUCTION_UPDATED',
          `Production: ${dto.productionStatus}`,
          dto.note,
          actor.userId,
        );
        if (dto.productionStatus === 'READY' && existing.status === 'PRODUCTION') {
          await this.transition(tx, await this.loadById(tx, actor.tenantId, existing.id), 'READY', actor.userId, dto.note);
          await this.communicate(tx, actor.tenantId, existing.id, 'READY_FOR_PICKUP', {});
        }
      }
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async cancel(actor: AuthPrincipal, id: string, dto: CancelCustomOrderDto, meta?: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.loadById(tx, actor.tenantId, id);
      if (!isCancellableCustomOrderStatus(existing.status)) {
        throw new ConflictException('This custom order cannot be cancelled.');
      }
      await this.releaseVariantStock(tx, actor, existing.id, meta);
      await asTx(tx).customOrder.update({
        where: { id: existing.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledById: actor.userId,
          cancelReason: dto.reason?.trim() || null,
          inventoryState: existing.inventoryState === 'RESERVED' ? 'RELEASED' : existing.inventoryState,
        },
      });
      const currentQuote = existing.quotes.find((quote) => quote.isCurrent);
      if (currentQuote && currentQuote.acceptanceState === 'PENDING') {
        await asTx(tx).customOrderQuote.update({ where: { id: currentQuote.id }, data: { acceptanceState: 'CANCELLED' } });
      }
      await this.appendTimeline(tx, actor.tenantId, existing.id, 'CANCELLED', 'Order cancelled', dto.reason, actor.userId);
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.CUSTOM_ORDER_CANCELLED,
          tenantId: actor.tenantId,
          userId: actor.userId,
          entity: 'CustomOrder',
          entityId: existing.id,
          metadata: { reason: dto.reason },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx,
      );
      return toDetail(await this.loadById(tx, actor.tenantId, existing.id));
    });
  }

  async listTimeline(tenantId: string, id: string) {
    await this.load(tenantId, id);
    const events = await this.prisma.customOrderTimelineEvent.findMany({
      where: { tenantId, customOrderId: id },
      orderBy: { createdAt: 'asc' },
    });
    return {
      items: events.map((event) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        detail: event.detail,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async addNote(actor: AuthPrincipal, id: string, dto: CustomOrderNoteDto) {
    const existing = await this.load(actor.tenantId, id);
    const note = await this.prisma.customOrderNote.create({
      data: {
        tenantId: actor.tenantId,
        customOrderId: existing.id,
        body: dto.body.trim(),
        createdById: actor.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    return {
      id: note.id,
      body: note.body,
      createdBy: note.createdBy,
      createdAt: note.createdAt.toISOString(),
    };
  }

  async listNotes(tenantId: string, id: string) {
    await this.load(tenantId, id);
    const notes = await this.prisma.customOrderNote.findMany({
      where: { tenantId, customOrderId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdBy: note.createdBy,
        createdAt: note.createdAt.toISOString(),
      })),
    };
  }

  async streamFile(tenantId: string, orderId: string, fileId: string, byPublicId = false) {
    const order = byPublicId ? await this.loadByPublicId(tenantId, orderId) : await this.load(tenantId, orderId);
    const file = order.files.find((row) => row.id === fileId) ?? order.designs.find((design) => design.file.id === fileId)?.file;
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    const record = await this.prisma.customOrderFile.findFirst({ where: { id: file.id, tenantId } });
    const stored = assertFound(record, 'File not found');
    let absolute: string;
    try {
      absolute = this.localStorage.resolveAbsolute(stored.storageKey);
    } catch {
      throw new NotFoundException('File not found.');
    }
    await access(absolute).catch(() => {
      throw new NotFoundException('File not found.');
    });
    const filename = sanitizeOriginalFilename(stored.originalFilename);
    return {
      file: stored,
      stream: new StreamableFile(createReadStream(absolute), {
        type: stored.mimeType,
        disposition: `inline; filename="${filename.replace(/"/g, '')}"`,
      }),
    };
  }

  async listOptions(tenantId: string) {
    const options = await this.prisma.customizationOption.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items: options.map((option) => this.toOptionDto(option)) };
  }

  async createOption(actor: AuthPrincipal, dto: CustomizationOptionDto) {
    const created = await this.prisma.customizationOption.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        pricingType: dto.pricingType,
        price: money(dto.price),
        status: dto.status ?? 'ACTIVE',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.toOptionDto(created);
  }

  async updateOption(actor: AuthPrincipal, id: string, dto: Partial<CustomizationOptionDto>) {
    const existing = await this.prisma.customizationOption.findFirst({ where: { id, tenantId: actor.tenantId } });
    const option = assertFound(existing, 'Customization option not found');
    const updated = await this.prisma.customizationOption.update({
      where: { id: option.id },
      data: {
        name: dto.name?.trim() ?? option.name,
        description: dto.description === undefined ? option.description : dto.description.trim() || null,
        pricingType: dto.pricingType ?? option.pricingType,
        price: dto.price ? money(dto.price) : option.price,
        status: dto.status ?? option.status,
        sortOrder: dto.sortOrder ?? option.sortOrder,
      },
    });
    return this.toOptionDto(updated);
  }

  private toOptionDto(option: {
    id: string;
    name: string;
    description: string | null;
    pricingType: CustomizationOptionDto['pricingType'];
    price: Prisma.Decimal;
    status: 'ACTIVE' | 'INACTIVE';
    sortOrder: number;
  }) {
    return {
      id: option.id,
      name: option.name,
      description: option.description,
      pricingType: option.pricingType,
      price: moneyString(option.price) ?? '0.00',
      status: option.status,
      sortOrder: option.sortOrder,
    };
  }

  private assertInquiryContact(dto: CustomOrderInquiryDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Name is required.');
    }
    if (!dto.phone?.trim() && !dto.email?.trim()) {
      throw new BadRequestException('Provide a phone number or email.');
    }
  }

  private async createOrderRecord(
    tx: object,
    tenantId: string,
    customerId: string,
    dto: CustomOrderInquiryDto,
    createdById?: string,
  ) {
    const orderNumber = await nextDocumentNumber(tx, tenantId, DOCUMENT_TYPES.CUSTOM_ORDER);
    return asTx(tx).customOrder.create({
      data: {
        tenantId,
        customerId,
        publicId: `co_${randomBytes(16).toString('hex')}`,
        orderNumber,
        type: dto.type ?? 'CUSTOM_JERSEY',
        description: dto.description?.trim() || null,
        teamName: dto.teamName?.trim() || null,
        preferredJerseyType: dto.preferredJerseyType?.trim() || null,
        preferredColours: dto.preferredColours?.trim() || null,
        customizationRequirements: dto.customizationRequirements?.trim() || null,
        estimatedQuantity: dto.quantity ?? 0,
        requestedDeliveryDate: dto.requiredDate ? this.parseDate(dto.requiredDate, 'requiredDate') : null,
        notes: dto.notes?.trim() || null,
        createdById,
      },
    });
  }

  private async replaceItems(
    tx: object,
    tenantId: string,
    customOrderId: string,
    items: Parameters<typeof normalizeCustomOrderItems>[0],
  ) {
    const normalized = normalizeCustomOrderItems(items);
    await asTx(tx).customOrderItem.deleteMany({ where: { tenantId, customOrderId } });
    if (normalized.length) {
      await asTx(tx).customOrderItem.createMany({
        data: normalized.map((item) => ({
          tenantId,
          customOrderId,
          ...item,
        })),
      });
    }
    await asTx(tx).customOrder.update({
      where: { id: customOrderId },
      data: {
        estimatedQuantity: totalItemQuantity(normalized),
        orderingMode: deriveOrderingMode(normalized),
      },
    });
  }

  private async replaceCustomizations(tx: object, tenantId: string, customOrderId: string, optionIds: string[]) {
    const uniqueIds = [...new Set(optionIds)];
    const options = await asTx(tx).customizationOption.findMany({
      where: { tenantId, id: { in: uniqueIds }, status: 'ACTIVE' },
    });
    if (options.length !== uniqueIds.length) {
      throw new BadRequestException('One or more customization options were not found.');
    }
    await asTx(tx).customOrderCustomization.deleteMany({ where: { tenantId, customOrderId } });
    await asTx(tx).customOrderCustomization.createMany({
      data: options.map((option) => ({
        tenantId,
        customOrderId,
        customizationOptionId: option.id,
        nameSnapshot: option.name,
        pricingTypeSnapshot: option.pricingType,
        priceSnapshot: option.price,
      })),
    });
  }

  private async computeSelectedCustomizationCharges(tx: object, tenantId: string, customOrderId: string, quantity: number) {
    const rows = await asTx(tx).customOrderCustomization.findMany({ where: { tenantId, customOrderId } });
    const order = await asTx(tx).customOrder.findFirst({ where: { id: customOrderId, tenantId } });
    const base = money(order?.subtotal?.toString() ?? '0');
    return rows.reduce(
      (sum, row) =>
        sum.add(
          computeCustomizationCharge({
            pricingType: row.pricingTypeSnapshot,
            price: money(row.priceSnapshot.toString()),
            quantity,
            baseAmount: base,
          }),
        ),
      money(0),
    );
  }

  private async storeFiles(
    tx: object,
    tenantId: string,
    customOrderId: string,
    files: UploadedCustomOrderFile[] | undefined,
    uploadedById: string | undefined,
    kind: 'REFERENCE' | 'DESIGN',
  ) {
    if (!files?.length) {
      return [];
    }
    if (files.length > CUSTOM_ORDER_MAX_FILES) {
      throw new BadRequestException(`A maximum of ${CUSTOM_ORDER_MAX_FILES} files can be uploaded.`);
    }
    const created: Array<{ id: string }> = [];
    for (const file of files) {
      const validated = validateCustomOrderFile(file);
      const key = customOrderStorageKey(tenantId, customOrderId, validated.storageName);
      await this.storage.put({ tenantId, key, body: validated.buffer, contentType: validated.mimeType });
      const row = await asTx(tx).customOrderFile.create({
        data: {
          tenantId,
          customOrderId,
          storageKey: key,
          originalFilename: validated.originalFilename,
          mimeType: validated.mimeType,
          fileSize: validated.fileSize,
          kind,
          uploadedById,
        },
        select: { id: true },
      });
      created.push(row);
    }
    return created;
  }

  private async recordDesignDecision(
    tx: object,
    existing: LoadedCustomOrder,
    decision: 'APPROVE' | 'REQUEST_CHANGES',
    comment: string | undefined,
    actor: { isCustomer: boolean; userId?: string; customerId?: string },
    meta?: RequestMeta,
  ) {
    const latest = existing.designs[0];
    if (!latest) {
      throw new BadRequestException('No design is available for approval.');
    }
    if (latest.approvalStatus === 'APPROVED' && decision === 'APPROVE') {
      throw new ConflictException('This design is already approved.');
    }
    await asTx(tx).customOrderDesignApproval.create({
      data: {
        tenantId: existing.tenantId,
        customOrderId: existing.id,
        designId: latest.id,
        decision,
        comment: comment?.trim() || null,
        decidedByUserId: actor.userId,
        decidedByCustomerId: actor.customerId,
        isCustomerDecision: actor.isCustomer,
      },
    });
    await asTx(tx).customOrderDesign.update({
      where: { id: latest.id },
      data: { approvalStatus: decision === 'APPROVE' ? 'APPROVED' : 'CHANGES_REQUESTED' },
    });
    if (decision === 'REQUEST_CHANGES' && existing.status === 'DESIGN_APPROVAL') {
      await this.transition(tx, existing, 'DESIGN_PENDING', actor.userId, comment);
    }
    await this.appendTimeline(
      tx,
      existing.tenantId,
      existing.id,
      decision === 'APPROVE' ? 'DESIGN_APPROVED' : 'DESIGN_CHANGES_REQUESTED',
      decision === 'APPROVE' ? `Design v${latest.version} approved` : `Changes requested on design v${latest.version}`,
      comment,
      actor.userId,
    );
    await this.audit.log(
      {
        action:
          decision === 'APPROVE'
            ? AUDIT_ACTIONS.CUSTOM_ORDER_DESIGN_APPROVED
            : AUDIT_ACTIONS.CUSTOM_ORDER_DESIGN_CHANGES_REQUESTED,
        tenantId: existing.tenantId,
        userId: actor.userId,
        entity: 'CustomOrderDesign',
        entityId: latest.id,
        metadata: { customOrderId: existing.id, version: latest.version, customer: actor.isCustomer },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
      tx,
    );
  }

  private assertQuoteAcceptable(quote: { acceptanceState: string; expiresAt: Date | null; isCurrent: boolean }) {
    if (!quote.isCurrent) {
      throw new ConflictException('Only the current quote can be accepted.');
    }
    if (quote.acceptanceState === 'CANCELLED' || quote.acceptanceState === 'SUPERSEDED') {
      throw new ConflictException('This quote cannot be accepted.');
    }
    if (quote.acceptanceState === 'ACCEPTED') {
      throw new ConflictException('This quote has already been accepted.');
    }
    if (quote.expiresAt && quote.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('This quote has expired.');
    }
  }

  private async transition(
    tx: object,
    existing: { id: string; tenantId: string; status: CustomOrderStatus },
    to: CustomOrderStatus,
    userId: string | undefined,
    detail?: string | null,
  ) {
    if (existing.status === to) {
      return;
    }
    assertCustomOrderTransition(existing.status, to);
    await asTx(tx).customOrder.update({ where: { id: existing.id }, data: { status: to } });
    await this.appendTimeline(tx, existing.tenantId, existing.id, 'STATUS_CHANGED', `Status changed to ${to}`, detail, userId);
    await this.audit.log(
      {
        action: AUDIT_ACTIONS.CUSTOM_ORDER_STATUS_CHANGED,
        tenantId: existing.tenantId,
        userId,
        entity: 'CustomOrder',
        entityId: existing.id,
        oldValue: { status: existing.status },
        newValue: { status: to },
      },
      tx,
    );
    existing.status = to;
  }

  private async communicate(
    tx: object,
    tenantId: string,
    customOrderId: string,
    type: CustomOrderCommunicationType,
    payload: Record<string, unknown>,
  ) {
    if (!(CUSTOM_ORDER_COMMUNICATION_TYPES as readonly string[]).includes(type)) {
      return;
    }
    await asTx(tx).customOrderCommunicationEvent.create({
      data: { tenantId, customOrderId, type, payload: payload as Prisma.InputJsonValue },
    });
  }

  private async appendTimeline(
    tx: object,
    tenantId: string,
    customOrderId: string,
    type: string,
    title: string,
    detail?: string | null,
    createdById?: string,
  ) {
    await asTx(tx).customOrderTimelineEvent.create({
      data: {
        tenantId,
        customOrderId,
        type,
        title,
        detail: detail ?? null,
        createdById,
      },
    });
  }

  private paidTotal(existing: { payments: Array<{ amount: Prisma.Decimal; status: string }> }) {
    return existing.payments
      .filter((payment) => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum.add(money(payment.amount.toString())), money(0));
  }

  private variantQuantities(items: Array<{ productVariantId: string | null; quantity: number }>) {
    const grouped = new Map<string, number>();
    for (const item of items) {
      if (!item.productVariantId) {
        continue;
      }
      grouped.set(item.productVariantId, (grouped.get(item.productVariantId) ?? 0) + item.quantity);
    }
    return grouped;
  }

  private inventoryActor(actor: AuthPrincipal, meta?: RequestMeta) {
    return { userId: actor.userId, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent };
  }

  private async reserveVariantStock(tx: object, actor: AuthPrincipal, customOrderId: string, meta?: RequestMeta) {
    const order = await this.loadById(tx, actor.tenantId, customOrderId);
    if (order.inventoryState === 'RESERVED') {
      return;
    }
    for (const [productVariantId, quantity] of this.variantQuantities(order.items)) {
      await this.inventory.reserveStock(
        actor.tenantId,
        productVariantId,
        { quantity, reason: 'Custom order reservation', referenceType: 'CustomOrder', referenceId: customOrderId },
        this.inventoryActor(actor, meta),
        meta,
        tx,
      );
    }
    await asTx(tx).customOrder.update({ where: { id: customOrderId }, data: { inventoryState: 'RESERVED' } });
  }

  private async releaseVariantStock(tx: object, actor: AuthPrincipal, customOrderId: string, meta?: RequestMeta) {
    const order = await this.loadById(tx, actor.tenantId, customOrderId);
    if (order.inventoryState !== 'RESERVED') {
      return;
    }
    for (const [productVariantId, quantity] of this.variantQuantities(order.items)) {
      await this.inventory.releaseStock(
        actor.tenantId,
        productVariantId,
        { quantity, reason: 'Custom order cancelled', referenceType: 'CustomOrder', referenceId: customOrderId },
        this.inventoryActor(actor, meta),
        meta,
        tx,
      );
    }
    await asTx(tx).customOrder.update({ where: { id: customOrderId }, data: { inventoryState: 'RELEASED' } });
  }

  private async consumeVariantStock(tx: object, actor: AuthPrincipal, customOrderId: string, meta?: RequestMeta) {
    const order = await this.loadById(tx, actor.tenantId, customOrderId);
    if (order.inventoryState !== 'RESERVED') {
      return;
    }
    for (const [productVariantId, quantity] of this.variantQuantities(order.items)) {
      await this.inventory.consumeReservedStock(
        {
          tenantId: actor.tenantId,
          productVariantId,
          quantity,
          type: InventoryMovementType.ONLINE_ORDER,
          reason: 'Custom order completed',
          referenceType: 'CustomOrder',
          referenceId: customOrderId,
          createdBy: actor.userId,
          actor: this.inventoryActor(actor, meta),
        },
        tx,
      );
    }
    await asTx(tx).customOrder.update({ where: { id: customOrderId }, data: { inventoryState: 'CONSUMED' } });
  }

  private parseDate(value: string, field: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date.`);
    }
    return parsed;
  }

  private async load(tenantId: string, id: string) {
    const record = await this.prisma.customOrder.findFirst({ where: { id, tenantId }, include: detailInclude });
    return assertFound(record, 'Custom order not found');
  }

  private async loadByPublicId(tenantId: string, publicId: string) {
    const record = await this.prisma.customOrder.findFirst({ where: { publicId, tenantId }, include: detailInclude });
    return assertFound(record, 'Custom order not found');
  }

  private async loadById(tx: object, tenantId: string, id: string): Promise<LoadedCustomOrder> {
    const record = await asTx(tx).customOrder.findFirst({ where: { id, tenantId }, include: detailInclude });
    return assertFound(record, 'Custom order not found');
  }

  private async loadByPublicIdTx(tx: object, tenantId: string, publicId: string): Promise<LoadedCustomOrder> {
    const record = await asTx(tx).customOrder.findFirst({ where: { publicId, tenantId }, include: detailInclude });
    return assertFound(record, 'Custom order not found');
  }
}
