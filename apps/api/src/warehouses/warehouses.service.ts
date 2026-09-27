import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { WarehouseDto } from '@jersey-commerce/types';
import type { Warehouse } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import type { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { DelhiveryClient, type DelhiveryWarehouse } from '../shipping/delhivery.client';
import { ShippingSettingsService } from '../shipping/shipping-settings.service';

const DELHIVERY_SYNC_FIELDS = ['name', 'phone', 'address', 'city', 'state', 'postalCode', 'country', 'delhiveryPickupLocation'] as const;

function toDto(row: Warehouse): WarehouseDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    delhiveryPickupLocation: row.delhiveryPickupLocation,
    delhiveryRegisteredAt: row.delhiveryRegisteredAt?.toISOString() ?? null,
    delhiveryLastError: row.delhiveryLastError,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly delhivery: DelhiveryClient,
    private readonly shippingSettings: ShippingSettingsService,
  ) {}

  async list(tenantId: string): Promise<{ items: WarehouseDto[] }> {
    const items = await this.prisma.warehouse.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items: items.map(toDto) };
  }

  async findById(tenantId: string, id: string): Promise<WarehouseDto> {
    const row = await this.prisma.warehouse.findFirst({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException('Warehouse not found');
    }
    return toDto(row);
  }

  async create(tenantId: string, dto: CreateWarehouseDto, actor: AuthPrincipal): Promise<WarehouseDto> {
    const created = await this.prisma.warehouse.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        country: (dto.country ?? 'IN').toUpperCase(),
        delhiveryPickupLocation: dto.delhiveryPickupLocation?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'Warehouse',
      entityId: created.id,
      metadata: { name: created.name, created: true },
    });
    return toDto(await this.trySyncToDelhivery(created));
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWarehouseDto,
    actor: AuthPrincipal,
  ): Promise<WarehouseDto> {
    const existing = await this.prisma.warehouse.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Warehouse not found');
    }
    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
        address: dto.address === undefined ? undefined : dto.address?.trim() || null,
        city: dto.city === undefined ? undefined : dto.city?.trim() || null,
        state: dto.state === undefined ? undefined : dto.state?.trim() || null,
        postalCode: dto.postalCode === undefined ? undefined : dto.postalCode?.trim() || null,
        country: dto.country === undefined ? undefined : dto.country.toUpperCase(),
        delhiveryPickupLocation:
          dto.delhiveryPickupLocation === undefined
            ? undefined
            : dto.delhiveryPickupLocation?.trim() || null,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'Warehouse',
      entityId: updated.id,
      metadata: { fields: Object.keys(dto) },
    });
    const originChanged = DELHIVERY_SYNC_FIELDS.some((field) => existing[field] !== updated[field]);
    if (updated.isActive && (originChanged || !updated.delhiveryRegisteredAt)) {
      return toDto(await this.trySyncToDelhivery(updated));
    }
    return toDto(updated);
  }

  async remove(tenantId: string, id: string, actor: AuthPrincipal): Promise<WarehouseDto> {
    const existing = await this.prisma.warehouse.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundException('Warehouse not found');
    }
    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PRODUCT_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'Warehouse',
      entityId: updated.id,
      metadata: { deactivated: true },
    });
    return toDto(updated);
  }

  /** Manual sync from admin — surfaces Delhivery's reason on failure. */
  async syncById(tenantId: string, id: string): Promise<WarehouseDto> {
    const row = await this.prisma.warehouse.findFirst({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException('Warehouse not found');
    }
    const synced = await this.syncToDelhivery(row);
    if (!synced.delhiveryRegisteredAt || synced.delhiveryLastError) {
      throw new BadRequestException(synced.delhiveryLastError ?? 'Delhivery registration failed.');
    }
    return toDto(synced);
  }

  /**
   * Registers the warehouse as a Delhivery pickup location and records the outcome.
   * Never throws for Delhivery failures; the error is stored on the row instead.
   */
  async syncToDelhivery(row: Warehouse): Promise<Warehouse> {
    const pickupName = (row.delhiveryPickupLocation?.trim() || row.name.trim()).slice(0, 100);
    const credentials = await this.shippingSettings.resolveCredentials(row.tenantId);
    if (!credentials) {
      return this.prisma.warehouse.update({
        where: { id: row.id },
        data: {
          delhiveryPickupLocation: pickupName,
          delhiveryLastError: 'Delhivery is not configured. Add credentials in Settings → Shipping.',
        },
      });
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: row.tenantId },
      select: { contactEmail: true },
    });
    try {
      await this.delhivery.registerWarehouse(
        credentials,
        this.toDelhiveryWarehouse({ ...row, delhiveryPickupLocation: pickupName }),
        tenant?.contactEmail,
      );
      return this.prisma.warehouse.update({
        where: { id: row.id },
        data: {
          delhiveryPickupLocation: pickupName,
          delhiveryRegisteredAt: new Date(),
          delhiveryLastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delhivery registration failed.';
      this.logger.warn(`Delhivery pickup sync failed for warehouse ${row.id}: ${message}`);
      return this.prisma.warehouse.update({
        where: { id: row.id },
        data: {
          delhiveryPickupLocation: pickupName,
          delhiveryRegisteredAt: null,
          delhiveryLastError: message.slice(0, 500),
        },
      });
    }
  }

  private async trySyncToDelhivery(row: Warehouse): Promise<Warehouse> {
    try {
      return await this.syncToDelhivery(row);
    } catch (error) {
      this.logger.warn(`Delhivery pickup sync crashed for warehouse ${row.id}: ${String(error)}`);
      return row;
    }
  }

  toDelhiveryWarehouse(row: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string;
    delhiveryPickupLocation: string | null;
  }): DelhiveryWarehouse {
    return {
      name: row.name,
      phone: row.phone ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      postalCode: row.postalCode ?? '',
      country: row.country || 'IN',
      pickupLocation: row.delhiveryPickupLocation?.trim() || row.name,
    };
  }

  async resolveForProduct(tenantId: string, warehouseId: string | null | undefined) {
    if (warehouseId) {
      const row = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId, isActive: true },
      });
      if (row) {
        return row;
      }
    }
    return this.prisma.warehouse.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
