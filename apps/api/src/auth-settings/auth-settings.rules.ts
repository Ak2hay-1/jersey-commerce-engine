import { BadRequestException } from '@nestjs/common';
import type { AuthSettings as AuthSettingsRecord } from '../../generated/prisma';
import type { EmailOtpProvider, SmsOtpProvider } from '@jersey-commerce/types';

export type ResolvedAuthSettings = AuthSettingsRecord & {
  resendApiKey?: string;
  smtpPassword?: string;
  smsApiKey?: string;
  twilioAuthToken?: string;
  googleClientSecret?: string;
};

export const DEFAULT_AUTH_FLAGS = {
  passwordLogin: true,
  emailOtp: false,
  smsOtp: false,
  googleSignIn: false,
} as const;

export function defaultAuthRecord(tenantId: string): Pick<
  AuthSettingsRecord,
  | 'passwordLoginEnabled'
  | 'emailOtpEnabled'
  | 'smsOtpEnabled'
  | 'googleSignInEnabled'
  | 'emailProvider'
  | 'emailFromAddress'
  | 'emailFromName'
  | 'resendApiKeyEncrypted'
  | 'smtpHost'
  | 'smtpPort'
  | 'smtpUser'
  | 'smtpPasswordEncrypted'
  | 'smtpSecure'
  | 'smsProvider'
  | 'smsApiKeyEncrypted'
  | 'smsSenderId'
  | 'twilioAccountSid'
  | 'twilioAuthTokenEncrypted'
  | 'smsFromNumber'
  | 'googleClientId'
  | 'googleClientSecretEncrypted'
  | 'otpTtlSeconds'
> & { tenantId: string } {
  return {
    tenantId,
    passwordLoginEnabled: true,
    emailOtpEnabled: false,
    smsOtpEnabled: false,
    googleSignInEnabled: false,
    emailProvider: 'CONSOLE',
    emailFromAddress: null,
    emailFromName: null,
    resendApiKeyEncrypted: null,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPasswordEncrypted: null,
    smtpSecure: true,
    smsProvider: 'CONSOLE',
    smsApiKeyEncrypted: null,
    smsSenderId: null,
    twilioAccountSid: null,
    twilioAuthTokenEncrypted: null,
    smsFromNumber: null,
    googleClientId: null,
    googleClientSecretEncrypted: null,
    otpTtlSeconds: 300,
  };
}

export function assertAtLeastOneLoginMethod(input: {
  passwordLoginEnabled: boolean;
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  googleSignInEnabled: boolean;
}): void {
  if (!input.passwordLoginEnabled && !input.emailOtpEnabled && !input.smsOtpEnabled && !input.googleSignInEnabled) {
    throw new BadRequestException('At least one sign-in method must stay enabled.');
  }
}

export function assertEmailOtpReady(
  enabled: boolean,
  provider: EmailOtpProvider,
  settings: {
    emailFromAddress: string | null;
    resendApiKey?: string;
    smtpHost: string | null;
    smtpUser: string | null;
    smtpPassword?: string;
  },
  secretsConfigured: boolean,
): void {
  if (!enabled) {
    return;
  }
  if (provider === 'CONSOLE') {
    return;
  }
  if (!secretsConfigured) {
    throw new BadRequestException('Set SECRETS_ENCRYPTION_KEY on the API before enabling a live email provider.');
  }
  if (!settings.emailFromAddress) {
    throw new BadRequestException('A from address is required for email OTP.');
  }
  if (provider === 'RESEND' && !settings.resendApiKey) {
    throw new BadRequestException('A Resend API key is required to enable email OTP.');
  }
  if (provider === 'SMTP' && (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword)) {
    throw new BadRequestException('SMTP host, username, and password are required to enable email OTP.');
  }
}

export function assertSmsOtpReady(
  enabled: boolean,
  provider: SmsOtpProvider,
  settings: {
    smsApiKey?: string;
    smsSenderId: string | null;
    twilioAccountSid: string | null;
    twilioAuthToken?: string;
    smsFromNumber: string | null;
  },
  secretsConfigured: boolean,
): void {
  if (!enabled) {
    return;
  }
  if (provider === 'CONSOLE') {
    return;
  }
  if (!secretsConfigured) {
    throw new BadRequestException('Set SECRETS_ENCRYPTION_KEY on the API before enabling a live SMS provider.');
  }
  if (provider === 'MSG91' && (!settings.smsApiKey || !settings.smsSenderId)) {
    throw new BadRequestException('MSG91 auth key and sender ID are required to enable SMS OTP.');
  }
  if (provider === 'TWILIO' && (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.smsFromNumber)) {
    throw new BadRequestException('Twilio account SID, auth token, and from number are required to enable SMS OTP.');
  }
}

export function assertGoogleReady(
  enabled: boolean,
  settings: { googleClientId: string | null; googleClientSecret?: string },
  secretsConfigured: boolean,
): void {
  if (!enabled) {
    return;
  }
  if (!secretsConfigured) {
    throw new BadRequestException('Set SECRETS_ENCRYPTION_KEY on the API before enabling Google Sign-In.');
  }
  if (!settings.googleClientId || !settings.googleClientSecret) {
    throw new BadRequestException('Google client ID and client secret are required to enable Google Sign-In.');
  }
}
