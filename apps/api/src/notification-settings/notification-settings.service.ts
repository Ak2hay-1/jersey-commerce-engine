import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { NotificationSettings } from '@jersey-commerce/types';
import type { NotificationSettings as NotificationSettingsRecord } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { decryptSecret, isSecretsKeyConfigured } from '../common/crypto/secret-crypto';
import type { AuthPrincipal } from '../common/context/request-context';
import { applySecretUpdate } from '../auth-settings/secret-update';
import type { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

export type TelegramNotifyEvent =
  | 'ORDER_CREATED'
  | 'CUSTOM_ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_STATUS_CHANGED'
  | 'POS_SALE';

function defaultRecord(tenantId: string): NotificationSettingsRecord {
  return {
    id: '',
    tenantId,
    telegramEnabled: false,
    telegramBotTokenEncrypted: null,
    telegramChatId: null,
    notifyOrderCreated: true,
    notifyCustomOrderCreated: true,
    notifyPaymentConfirmed: true,
    notifyOrderStatusChanged: true,
    notifyPosSale: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function eventEnabled(row: NotificationSettingsRecord, event: TelegramNotifyEvent): boolean {
  switch (event) {
    case 'ORDER_CREATED':
      return row.notifyOrderCreated;
    case 'CUSTOM_ORDER_CREATED':
      return row.notifyCustomOrderCreated;
    case 'PAYMENT_CONFIRMED':
      return row.notifyPaymentConfirmed;
    case 'ORDER_STATUS_CHANGED':
      return row.notifyOrderStatusChanged;
    case 'POS_SALE':
      return row.notifyPosSale;
    default:
      return false;
  }
}

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
    private readonly audit: AuditService,
  ) {}

  secretsConfigured(): boolean {
    return isSecretsKeyConfigured(this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true }));
  }

  async getSettings(tenantId: string): Promise<NotificationSettings> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { tenantId } });
    return this.toDto(row, tenantId);
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateNotificationSettingsDto,
    actor: AuthPrincipal,
  ): Promise<NotificationSettings> {
    const existing = await this.getSettings(tenantId);
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    const current = await this.prisma.notificationSettings.findUnique({ where: { tenantId } });
    const nextToken = applySecretUpdate(
      dto.telegramBotToken,
      current?.telegramBotTokenEncrypted ?? null,
      secretKey,
    );
    const updated = await this.prisma.notificationSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        telegramEnabled: dto.telegramEnabled,
        telegramChatId: dto.telegramChatId === undefined ? null : dto.telegramChatId,
        telegramBotTokenEncrypted: nextToken,
        notifyOrderCreated: dto.notifyOrderCreated,
        notifyCustomOrderCreated: dto.notifyCustomOrderCreated,
        notifyPaymentConfirmed: dto.notifyPaymentConfirmed,
        notifyOrderStatusChanged: dto.notifyOrderStatusChanged,
        notifyPosSale: dto.notifyPosSale,
      },
      update: {
        telegramEnabled: dto.telegramEnabled,
        telegramChatId: dto.telegramChatId === undefined ? undefined : dto.telegramChatId,
        telegramBotTokenEncrypted: dto.telegramBotToken === undefined ? undefined : nextToken,
        notifyOrderCreated: dto.notifyOrderCreated,
        notifyCustomOrderCreated: dto.notifyCustomOrderCreated,
        notifyPaymentConfirmed: dto.notifyPaymentConfirmed,
        notifyOrderStatusChanged: dto.notifyOrderStatusChanged,
        notifyPosSale: dto.notifyPosSale,
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.NOTIFICATION_SETTINGS_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'NotificationSettings',
      entityId: updated.id,
      oldValue: { telegramEnabled: existing.telegramEnabled },
      newValue: { telegramEnabled: updated.telegramEnabled },
    });
    return this.toDto(updated, tenantId);
  }

  async sendTestMessage(tenantId: string): Promise<{ ok: true }> {
    await this.sendRaw(tenantId, 'Jerzyfy test: Telegram notifications are working.');
    return { ok: true };
  }

  /**
   * Fire-and-forget staff alert. Never throws to callers — failures are logged only.
   * Schedule after the DB transaction that produced the event has committed.
   */
  schedule(tenantId: string, event: TelegramNotifyEvent, text: string): void {
    setImmediate(() => {
      void this.notify(tenantId, event, text).catch((error: unknown) => {
        this.logger.warn(
          `Telegram notify failed for ${event}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    });
  }

  async notify(tenantId: string, event: TelegramNotifyEvent, text: string): Promise<void> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { tenantId } });
    if (!row?.telegramEnabled || !eventEnabled(row, event)) {
      return;
    }
    await this.sendWithRow(row, text);
  }

  private async sendRaw(tenantId: string, text: string): Promise<void> {
    const row = await this.prisma.notificationSettings.findUnique({ where: { tenantId } });
    if (!row) {
      throw new Error('Telegram is not configured. Save notification settings first.');
    }
    await this.sendWithRow(row, text);
  }

  private async sendWithRow(row: NotificationSettingsRecord, text: string): Promise<void> {
    const chatId = row.telegramChatId?.trim();
    if (!chatId) {
      throw new Error('Telegram chat ID is not set.');
    }
    if (!row.telegramBotTokenEncrypted) {
      throw new Error('Telegram bot token is not set.');
    }
    const secretKey = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    if (!isSecretsKeyConfigured(secretKey)) {
      throw new Error('SECRETS_ENCRYPTION_KEY is not configured.');
    }
    const token = decryptSecret(row.telegramBotTokenEncrypted, secretKey!.trim());
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram API ${response.status}: ${body.slice(0, 200)}`);
    }
  }

  private toDto(row: NotificationSettingsRecord | null, tenantId: string): NotificationSettings {
    const source = row ?? defaultRecord(tenantId);
    return {
      tenantId,
      telegramEnabled: source.telegramEnabled,
      telegramChatId: source.telegramChatId,
      hasTelegramBotToken: Boolean(source.telegramBotTokenEncrypted),
      notifyOrderCreated: source.notifyOrderCreated,
      notifyCustomOrderCreated: source.notifyCustomOrderCreated,
      notifyPaymentConfirmed: source.notifyPaymentConfirmed,
      notifyOrderStatusChanged: source.notifyOrderStatusChanged,
      notifyPosSale: source.notifyPosSale,
      secretsEncryptionConfigured: this.secretsConfigured(),
      createdAt: row?.createdAt.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
}
