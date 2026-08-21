import type { EmailOtpProvider, SmsOtpProvider } from './enums';

export interface StorefrontAuthMethods {
  passwordLogin: boolean;
  emailOtp: boolean;
  smsOtp: boolean;
  googleSignIn: boolean;
}

export interface AuthSettings {
  tenantId: string;
  passwordLoginEnabled: boolean;
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  googleSignInEnabled: boolean;
  emailProvider: EmailOtpProvider;
  emailFromAddress: string | null;
  emailFromName: string | null;
  hasResendApiKey: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  hasSmtpPassword: boolean;
  smtpSecure: boolean;
  smsProvider: SmsOtpProvider;
  hasSmsApiKey: boolean;
  smsSenderId: string | null;
  twilioAccountSid: string | null;
  hasTwilioAuthToken: boolean;
  smsFromNumber: string | null;
  googleClientId: string | null;
  hasGoogleClientSecret: boolean;
  otpTtlSeconds: number;
  secretsEncryptionConfigured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateAuthSettingsInput {
  passwordLoginEnabled: boolean;
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  googleSignInEnabled: boolean;
  emailProvider: EmailOtpProvider;
  emailFromAddress?: string | null;
  emailFromName?: string | null;
  resendApiKey?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpSecure?: boolean;
  smsProvider: SmsOtpProvider;
  smsApiKey?: string | null;
  smsSenderId?: string | null;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  smsFromNumber?: string | null;
  googleClientId?: string | null;
  googleClientSecret?: string | null;
  otpTtlSeconds?: number;
}
