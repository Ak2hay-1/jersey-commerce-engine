import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { PaymentSettings, StorefrontPaymentMethods } from '@jersey-commerce/types';
import type { PaymentSettings as PaymentSettingsRecord } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { isSecretsKeyConfigured } from '../common/crypto/secret-crypto';
import type { AuthPrincipal } from '../common/context/request-context';
import { applySecretUpdate } from '../auth-settings/secret-update';
import type { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

function defaultRecord(tenantId: string): PaymentSettingsRecord {
  return {
    id: '',
    tenantId,
    razorpayEnabled: false,
    razorpayKeyId: null,
    razorpayKeySecretEncrypted: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

@Injectable()
export class PaymentSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
    private readonly audit: AuditService,
  ) {}

  secretsConfigured(): boolean {
    return isSecretsKeyConfigured(this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true }));
  }

  async getPublicFlags(tenantId: string): Promise<StorefrontPaymentMethods> {
    const row = await this.prisma.paymentSettings.findUnique({ where: { tenantId } });
    if (!row?.razorpayEnabled || !row.razorpayKeyId?.trim()) {
      return { razorpay: false, razorpayKeyId: null };
    }
    return { razorpay: true, razorpayKeyId: row.razorpayKeyId.trim() };
  }

  async getSettings(tenantId: string): Promise<PaymentSettings> {
    const row = await this.prisma.paymentSettings.findUnique({ where: { tenantId } });
    return this.toDto(row, tenantId);
  }

  async updateSettings(tenantId: string, dto: UpdatePaymentSettingsDto, actor: AuthPrincipal): Promise<PaymentSettings> {
    const existing = await this.getSettings(tenantId);
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    const current = await this.prisma.paymentSettings.findUnique({ where: { tenantId } });
    const nextSecret = applySecretUpdate(
      dto.razorpayKeySecret,
      current?.razorpayKeySecretEncrypted ?? null,
      secretKey,
    );
    const updated = await this.prisma.paymentSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        razorpayEnabled: dto.razorpayEnabled,
        razorpayKeyId: dto.razorpayKeyId === undefined ? null : dto.razorpayKeyId,
        razorpayKeySecretEncrypted: nextSecret,
      },
      update: {
        razorpayEnabled: dto.razorpayEnabled,
        razorpayKeyId: dto.razorpayKeyId === undefined ? undefined : dto.razorpayKeyId,
        razorpayKeySecretEncrypted: dto.razorpayKeySecret === undefined ? undefined : nextSecret,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.PAYMENT_SETTINGS_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'PaymentSettings',
      entityId: updated.id,
      oldValue: { razorpayEnabled: existing.razorpayEnabled },
      newValue: { razorpayEnabled: updated.razorpayEnabled },
    });
    return this.toDto(updated, tenantId);
  }

  private toDto(row: PaymentSettingsRecord | null, tenantId: string): PaymentSettings {
    const source = row ?? defaultRecord(tenantId);
    return {
      tenantId,
      razorpayEnabled: source.razorpayEnabled,
      razorpayKeyId: source.razorpayKeyId,
      hasRazorpayKeySecret: Boolean(source.razorpayKeySecretEncrypted),
      secretsEncryptionConfigured: this.secretsConfigured(),
      createdAt: row?.createdAt.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
}
