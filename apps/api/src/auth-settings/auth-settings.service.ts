import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { AuthSettings, StorefrontAuthMethods } from '@jersey-commerce/types';
import type { AuthSettings as AuthSettingsRecord } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { decryptSecret, isSecretsKeyConfigured } from '../common/crypto/secret-crypto';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { EmailSenderService } from './email-sender.service';
import { buildOtpEmail } from './otp-email.template';
import { SmsSenderService } from './sms-sender.service';
import {
  assertAtLeastOneLoginMethod,
  assertEmailOtpReady,
  assertGoogleReady,
  assertSmsOtpReady,
  DEFAULT_AUTH_FLAGS,
  defaultAuthRecord,
} from './auth-settings.rules';
import { applySecretUpdate } from './secret-update';
import type { TestEmailDto, TestSmsDto, UpdateAuthSettingsDto } from './dto/update-auth-settings.dto';

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

@Injectable()
export class AuthSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ServerEnv, true>,
    private readonly audit: AuditService,
    private readonly email: EmailSenderService,
    private readonly sms: SmsSenderService,
  ) {}

  secretsConfigured(): boolean {
    return isSecretsKeyConfigured(this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true }));
  }

  async getPublicFlags(tenantId: string): Promise<StorefrontAuthMethods> {
    const row = await this.prisma.authSettings.findUnique({ where: { tenantId } });
    if (!row) {
      return { ...DEFAULT_AUTH_FLAGS };
    }
    return {
      passwordLogin: row.passwordLoginEnabled,
      emailOtp: row.emailOtpEnabled,
      smsOtp: row.smsOtpEnabled,
      googleSignIn: row.googleSignInEnabled,
    };
  }

  async getSettings(tenantId: string): Promise<AuthSettings> {
    const row = await this.prisma.authSettings.findUnique({ where: { tenantId } });
    return this.toDto(row, tenantId);
  }

  async getResolved(tenantId: string): Promise<AuthSettingsRecord & {
    resendApiKey?: string;
    smtpPassword?: string;
    smsApiKey?: string;
    twilioAuthToken?: string;
    googleClientSecret?: string;
  }> {
    const row =
      (await this.prisma.authSettings.findUnique({ where: { tenantId } })) ??
      ({ id: '', createdAt: new Date(), updatedAt: new Date(), ...defaultAuthRecord(tenantId) } as AuthSettingsRecord);
    return this.decryptRow(row);
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateAuthSettingsDto,
    actor: AuthPrincipal,
    meta?: RequestMeta,
  ): Promise<AuthSettings> {
    assertAtLeastOneLoginMethod(dto);
    const existing = await this.prisma.authSettings.findUnique({ where: { tenantId } });
    const key = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    let resendApiKeyEncrypted: string | null;
    let smtpPasswordEncrypted: string | null;
    let smsApiKeyEncrypted: string | null;
    let twilioAuthTokenEncrypted: string | null;
    let googleClientSecretEncrypted: string | null;
    try {
      resendApiKeyEncrypted = applySecretUpdate(dto.resendApiKey, existing?.resendApiKeyEncrypted ?? null, key);
      smtpPasswordEncrypted = applySecretUpdate(dto.smtpPassword, existing?.smtpPasswordEncrypted ?? null, key);
      smsApiKeyEncrypted = applySecretUpdate(dto.smsApiKey, existing?.smsApiKeyEncrypted ?? null, key);
      twilioAuthTokenEncrypted = applySecretUpdate(dto.twilioAuthToken, existing?.twilioAuthTokenEncrypted ?? null, key);
      googleClientSecretEncrypted = applySecretUpdate(
        dto.googleClientSecret,
        existing?.googleClientSecretEncrypted ?? null,
        key,
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Could not store provider secrets.');
    }

    const merged = {
      emailFromAddress: this.nextText(dto.emailFromAddress, existing?.emailFromAddress ?? null),
      emailFromName: this.nextText(dto.emailFromName, existing?.emailFromName ?? null),
      smtpHost: this.nextText(dto.smtpHost, existing?.smtpHost ?? null),
      smtpPort: dto.smtpPort === undefined ? existing?.smtpPort ?? null : dto.smtpPort,
      smtpUser: this.nextText(dto.smtpUser, existing?.smtpUser ?? null),
      smsSenderId: this.nextText(dto.smsSenderId, existing?.smsSenderId ?? null),
      twilioAccountSid: this.nextText(dto.twilioAccountSid, existing?.twilioAccountSid ?? null),
      smsFromNumber: this.nextText(dto.smsFromNumber, existing?.smsFromNumber ?? null),
      googleClientId: this.nextText(dto.googleClientId, existing?.googleClientId ?? null),
    };
    const decrypted = this.decryptValues({
      resendApiKeyEncrypted,
      smtpPasswordEncrypted,
      smsApiKeyEncrypted,
      twilioAuthTokenEncrypted,
      googleClientSecretEncrypted,
    });
    const secretsConfigured = this.secretsConfigured();
    assertEmailOtpReady(
      dto.emailOtpEnabled,
      dto.emailProvider,
      {
        emailFromAddress: merged.emailFromAddress,
        resendApiKey: decrypted.resendApiKey,
        smtpHost: merged.smtpHost,
        smtpUser: merged.smtpUser,
        smtpPassword: decrypted.smtpPassword,
      },
      secretsConfigured,
    );
    assertSmsOtpReady(
      dto.smsOtpEnabled,
      dto.smsProvider,
      {
        smsApiKey: decrypted.smsApiKey,
        smsSenderId: merged.smsSenderId,
        twilioAccountSid: merged.twilioAccountSid,
        twilioAuthToken: decrypted.twilioAuthToken,
        smsFromNumber: merged.smsFromNumber,
      },
      secretsConfigured,
    );
    assertGoogleReady(
      dto.googleSignInEnabled,
      { googleClientId: merged.googleClientId, googleClientSecret: decrypted.googleClientSecret },
      secretsConfigured,
    );

    const data = {
      passwordLoginEnabled: dto.passwordLoginEnabled,
      emailOtpEnabled: dto.emailOtpEnabled,
      smsOtpEnabled: dto.smsOtpEnabled,
      googleSignInEnabled: dto.googleSignInEnabled,
      emailProvider: dto.emailProvider,
      emailFromAddress: merged.emailFromAddress,
      emailFromName: merged.emailFromName,
      resendApiKeyEncrypted,
      smtpHost: merged.smtpHost,
      smtpPort: merged.smtpPort,
      smtpUser: merged.smtpUser,
      smtpPasswordEncrypted,
      smtpSecure: dto.smtpSecure ?? existing?.smtpSecure ?? true,
      smsProvider: dto.smsProvider,
      smsApiKeyEncrypted,
      smsSenderId: merged.smsSenderId,
      twilioAccountSid: merged.twilioAccountSid,
      twilioAuthTokenEncrypted,
      smsFromNumber: merged.smsFromNumber,
      googleClientId: merged.googleClientId,
      googleClientSecretEncrypted,
      otpTtlSeconds: dto.otpTtlSeconds ?? existing?.otpTtlSeconds ?? 300,
    };

    const saved = existing
      ? await this.prisma.authSettings.update({ where: { tenantId }, data })
      : await this.prisma.authSettings.create({ data: { tenantId, ...data } });

    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_SETTINGS_UPDATED,
      tenantId,
      userId: actor.userId,
      entity: 'AuthSettings',
      entityId: saved.id,
      metadata: {
        passwordLoginEnabled: saved.passwordLoginEnabled,
        emailOtpEnabled: saved.emailOtpEnabled,
        smsOtpEnabled: saved.smsOtpEnabled,
        googleSignInEnabled: saved.googleSignInEnabled,
        emailProvider: saved.emailProvider,
        smsProvider: saved.smsProvider,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.toDto(saved, tenantId);
  }

  async sendTestEmail(tenantId: string, dto: TestEmailDto, actor: AuthPrincipal): Promise<{ sent: true }> {
    const settings = await this.getResolved(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const storeName = settings.emailFromName?.trim() || tenant?.name?.trim() || 'Your store';
    const expiresInMinutes = Math.max(1, Math.round((settings.otpTtlSeconds || 300) / 60));
    const message = buildOtpEmail({
      storeName,
      code: '123456',
      expiresInMinutes,
      preview: true,
    });
    await this.email.send(settings, {
      to: dto.to,
      ...message,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_TEST_EMAIL_SENT,
      tenantId,
      userId: actor.userId,
      entity: 'AuthSettings',
      entityId: settings.id || tenantId,
      metadata: { provider: settings.emailProvider },
    });
    return { sent: true };
  }

  async sendTestSms(tenantId: string, dto: TestSmsDto, actor: AuthPrincipal): Promise<{ sent: true }> {
    const settings = await this.getResolved(tenantId);
    await this.sms.send(settings, {
      to: dto.to,
      text: 'Test message from your store. SMS delivery is working.',
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_TEST_SMS_SENT,
      tenantId,
      userId: actor.userId,
      entity: 'AuthSettings',
      entityId: settings.id || tenantId,
      metadata: { provider: settings.smsProvider },
    });
    return { sent: true };
  }

  private nextText(incoming: string | null | undefined, existing: string | null): string | null {
    if (incoming === undefined || incoming === '') {
      return existing;
    }
    return incoming;
  }

  private decryptRow(row: AuthSettingsRecord) {
    const values = this.decryptValues(row);
    return { ...row, ...values };
  }

  private decryptValues(row: {
    resendApiKeyEncrypted: string | null;
    smtpPasswordEncrypted: string | null;
    smsApiKeyEncrypted: string | null;
    twilioAuthTokenEncrypted: string | null;
    googleClientSecretEncrypted: string | null;
  }) {
    const key = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true });
    const decode = (payload: string | null): string | undefined => {
      if (!payload || !isSecretsKeyConfigured(key)) {
        return undefined;
      }
      try {
        return decryptSecret(payload, key.trim());
      } catch {
        return undefined;
      }
    };
    return {
      resendApiKey: decode(row.resendApiKeyEncrypted),
      smtpPassword: decode(row.smtpPasswordEncrypted),
      smsApiKey: decode(row.smsApiKeyEncrypted),
      twilioAuthToken: decode(row.twilioAuthTokenEncrypted),
      googleClientSecret: decode(row.googleClientSecretEncrypted),
    };
  }

  private toDto(row: AuthSettingsRecord | null, tenantId: string): AuthSettings {
    const source = row ?? { id: '', createdAt: null, updatedAt: null, ...defaultAuthRecord(tenantId) };
    return {
      tenantId,
      passwordLoginEnabled: source.passwordLoginEnabled,
      emailOtpEnabled: source.emailOtpEnabled,
      smsOtpEnabled: source.smsOtpEnabled,
      googleSignInEnabled: source.googleSignInEnabled,
      emailProvider: source.emailProvider,
      emailFromAddress: source.emailFromAddress,
      emailFromName: source.emailFromName,
      hasResendApiKey: Boolean(source.resendApiKeyEncrypted),
      smtpHost: source.smtpHost,
      smtpPort: source.smtpPort,
      smtpUser: source.smtpUser,
      hasSmtpPassword: Boolean(source.smtpPasswordEncrypted),
      smtpSecure: source.smtpSecure,
      smsProvider: source.smsProvider,
      hasSmsApiKey: Boolean(source.smsApiKeyEncrypted),
      smsSenderId: source.smsSenderId,
      twilioAccountSid: source.twilioAccountSid,
      hasTwilioAuthToken: Boolean(source.twilioAuthTokenEncrypted),
      smsFromNumber: source.smsFromNumber,
      googleClientId: source.googleClientId,
      hasGoogleClientSecret: Boolean(source.googleClientSecretEncrypted),
      otpTtlSeconds: source.otpTtlSeconds,
      secretsEncryptionConfigured: this.secretsConfigured(),
      createdAt: toIso(source.createdAt),
      updatedAt: toIso(source.updatedAt),
    };
  }
}
