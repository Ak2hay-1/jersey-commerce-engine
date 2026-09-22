import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { ShippingSettings } from '@jersey-commerce/types';
import type { ShippingSettings as ShippingSettingsRecord } from '../../generated/prisma';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { decryptSecret, isSecretsKeyConfigured } from '../common/crypto/secret-crypto';
import { applySecretUpdate } from '../auth-settings/secret-update';
import type { AuthPrincipal } from '../common/context/request-context';
import type { UpdateShippingSettingsDto } from './dto/shipping.dto';
import type { DelhiveryCredentials, DelhiveryWarehouse } from './delhivery.client';

function defaultRecord(tenantId: string): ShippingSettingsRecord {
  return {
    id: '',
    tenantId,
    delhiveryEnabled: false,
    delhiveryApiTokenEncrypted: null,
    delhiveryEnvironment: 'STAGING',
    delhiveryServiceMode: 'SURFACE',
    codEnabled: false,
    defaultPackageWeightKg: new Prisma.Decimal('0.5'),
    warehouseName: null,
    warehousePhone: null,
    warehouseAddress: null,
    warehouseCity: null,
    warehouseState: null,
    warehousePostalCode: null,
    warehouseCountry: 'IN',
    pickupLocation: null,
    webhookSecretEncrypted: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

@Injectable()
export class ShippingSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
    private readonly audit: AuditService,
  ) {}

  secretsConfigured(): boolean {
    return isSecretsKeyConfigured(this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true }));
  }

  async getSettings(tenantId: string): Promise<ShippingSettings> {
    const row = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    return this.toDto(row, tenantId);
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateShippingSettingsDto,
    actor: AuthPrincipal,
  ): Promise<ShippingSettings> {
    const existing = await this.getSettings(tenantId);
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    const current = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    const nextToken = applySecretUpdate(dto.delhiveryApiToken, current?.delhiveryApiTokenEncrypted ?? null, secretKey);
    const nextWebhook = applySecretUpdate(dto.webhookSecret, current?.webhookSecretEncrypted ?? null, secretKey);
    const weight = new Prisma.Decimal(dto.defaultPackageWeightKg);
    if (weight.lte(0)) {
      throw new BadRequestException('Default package weight must be greater than zero.');
    }
    const updated = await this.prisma.shippingSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        delhiveryEnabled: dto.delhiveryEnabled,
        delhiveryApiTokenEncrypted: nextToken,
        delhiveryEnvironment: dto.delhiveryEnvironment,
        delhiveryServiceMode: dto.delhiveryServiceMode,
        codEnabled: dto.codEnabled,
        defaultPackageWeightKg: weight,
        warehouseName: dto.warehouseName ?? null,
        warehousePhone: dto.warehousePhone ?? null,
        warehouseAddress: dto.warehouseAddress ?? null,
        warehouseCity: dto.warehouseCity ?? null,
        warehouseState: dto.warehouseState ?? null,
        warehousePostalCode: dto.warehousePostalCode ?? null,
        warehouseCountry: (dto.warehouseCountry ?? 'IN').toUpperCase(),
        pickupLocation: dto.pickupLocation ?? null,
        webhookSecretEncrypted: nextWebhook,
      },
      update: {
        delhiveryEnabled: dto.delhiveryEnabled,
        delhiveryApiTokenEncrypted: dto.delhiveryApiToken === undefined ? undefined : nextToken,
        delhiveryEnvironment: dto.delhiveryEnvironment,
        delhiveryServiceMode: dto.delhiveryServiceMode,
        codEnabled: dto.codEnabled,
        defaultPackageWeightKg: weight,
        warehouseName: dto.warehouseName === undefined ? undefined : dto.warehouseName,
        warehousePhone: dto.warehousePhone === undefined ? undefined : dto.warehousePhone,
        warehouseAddress: dto.warehouseAddress === undefined ? undefined : dto.warehouseAddress,
        warehouseCity: dto.warehouseCity === undefined ? undefined : dto.warehouseCity,
        warehouseState: dto.warehouseState === undefined ? undefined : dto.warehouseState,
        warehousePostalCode: dto.warehousePostalCode === undefined ? undefined : dto.warehousePostalCode,
        warehouseCountry: dto.warehouseCountry === undefined ? undefined : dto.warehouseCountry.toUpperCase(),
        pickupLocation: dto.pickupLocation === undefined ? undefined : dto.pickupLocation,
        webhookSecretEncrypted: dto.webhookSecret === undefined ? undefined : nextWebhook,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.SHIPPING_SETTINGS_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'ShippingSettings',
      entityId: updated.id,
      oldValue: { delhiveryEnabled: existing.delhiveryEnabled, codEnabled: existing.codEnabled },
      newValue: { delhiveryEnabled: updated.delhiveryEnabled, codEnabled: updated.codEnabled },
    });
    return this.toDto(updated, tenantId);
  }

  async resolveCredentials(tenantId: string): Promise<DelhiveryCredentials | null> {
    const row = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    if (row && row.delhiveryEnabled === false) {
      return null;
    }
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    if (row?.delhiveryEnabled && row.delhiveryApiTokenEncrypted && isSecretsKeyConfigured(secretKey)) {
      try {
        return {
          apiToken: decryptSecret(row.delhiveryApiTokenEncrypted, secretKey.trim()),
          environment: row.delhiveryEnvironment,
        };
      } catch {
        // Fall through to env.
      }
    }
    return this.envCredentials(row?.delhiveryEnvironment ?? 'STAGING');
  }

  async isCodOffered(tenantId: string): Promise<boolean> {
    const row = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    if (!row?.delhiveryEnabled || !row.codEnabled) {
      return false;
    }
    const credentials = await this.resolveCredentials(tenantId);
    return Boolean(credentials);
  }

  async requireWarehouse(tenantId: string): Promise<DelhiveryWarehouse> {
    const row = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    if (!row) {
      throw new BadRequestException('Configure Delhivery warehouse details in Settings → Shipping.');
    }
    const name = row.warehouseName?.trim();
    const phone = row.warehousePhone?.trim();
    const address = row.warehouseAddress?.trim();
    const city = row.warehouseCity?.trim();
    const state = row.warehouseState?.trim();
    const postalCode = row.warehousePostalCode?.trim();
    const pickupLocation = row.pickupLocation?.trim() || name;
    if (!name || !phone || !address || !city || !state || !postalCode || !pickupLocation) {
      throw new BadRequestException('Complete Delhivery warehouse / pickup details before creating shipments.');
    }
    return {
      name,
      phone,
      address,
      city,
      state,
      postalCode,
      country: row.warehouseCountry || 'IN',
      pickupLocation,
    };
  }

  async getRecord(tenantId: string): Promise<ShippingSettingsRecord | null> {
    return this.prisma.shippingSettings.findUnique({ where: { tenantId } });
  }

  async resolveWebhookSecret(tenantId: string): Promise<string | null> {
    const row = await this.prisma.shippingSettings.findUnique({ where: { tenantId } });
    if (!row?.webhookSecretEncrypted) {
      return null;
    }
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    if (!isSecretsKeyConfigured(secretKey)) {
      return null;
    }
    try {
      return decryptSecret(row.webhookSecretEncrypted, secretKey.trim());
    } catch {
      return null;
    }
  }

  private envCredentials(environment: DelhiveryCredentials['environment']): DelhiveryCredentials | null {
    const token = this.config.get('DELHIVERY_API_TOKEN', { infer: true })?.trim() ?? '';
    if (!token) {
      return null;
    }
    const env = this.config.get('DELHIVERY_ENVIRONMENT', { infer: true })?.trim().toUpperCase();
    return {
      apiToken: token,
      environment: env === 'PRODUCTION' ? 'PRODUCTION' : environment,
    };
  }

  private toDto(row: ShippingSettingsRecord | null, tenantId: string): ShippingSettings {
    const source = row ?? defaultRecord(tenantId);
    return {
      tenantId,
      delhiveryEnabled: source.delhiveryEnabled,
      hasDelhiveryApiToken: Boolean(source.delhiveryApiTokenEncrypted) || Boolean(this.envCredentials(source.delhiveryEnvironment)),
      delhiveryEnvironment: source.delhiveryEnvironment,
      delhiveryServiceMode: source.delhiveryServiceMode,
      codEnabled: source.codEnabled,
      defaultPackageWeightKg: source.defaultPackageWeightKg.toFixed(3),
      warehouseName: source.warehouseName,
      warehousePhone: source.warehousePhone,
      warehouseAddress: source.warehouseAddress,
      warehouseCity: source.warehouseCity,
      warehouseState: source.warehouseState,
      warehousePostalCode: source.warehousePostalCode,
      warehouseCountry: source.warehouseCountry,
      pickupLocation: source.pickupLocation,
      hasWebhookSecret: Boolean(source.webhookSecretEncrypted),
      secretsEncryptionConfigured: this.secretsConfigured(),
      createdAt: row?.createdAt.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
}
