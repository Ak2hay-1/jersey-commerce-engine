import { z } from 'zod';

export const EMAIL_OTP_PROVIDERS = ['CONSOLE', 'RESEND', 'SMTP'] as const;
export const SMS_OTP_PROVIDERS = ['CONSOLE', 'MSG91', 'TWILIO'] as const;
export const OTP_CHANNELS = ['email', 'sms'] as const;

const secretField = z.string().max(512).nullable().optional();

export const updateAuthSettingsSchema = z.object({
  passwordLoginEnabled: z.boolean(),
  emailOtpEnabled: z.boolean(),
  smsOtpEnabled: z.boolean(),
  googleSignInEnabled: z.boolean(),
  emailProvider: z.enum(EMAIL_OTP_PROVIDERS),
  emailFromAddress: z.string().trim().email().max(320).nullable().optional(),
  emailFromName: z.string().trim().max(120).nullable().optional(),
  resendApiKey: secretField,
  smtpHost: z.string().trim().max(255).nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).nullable().optional(),
  smtpUser: z.string().trim().max(320).nullable().optional(),
  smtpPassword: secretField,
  smtpSecure: z.boolean().optional(),
  smsProvider: z.enum(SMS_OTP_PROVIDERS),
  smsApiKey: secretField,
  smsSenderId: z.string().trim().max(32).nullable().optional(),
  twilioAccountSid: z.string().trim().max(64).nullable().optional(),
  twilioAuthToken: secretField,
  smsFromNumber: z.string().trim().max(32).nullable().optional(),
  googleClientId: z.string().trim().max(255).nullable().optional(),
  googleClientSecret: secretField,
  otpTtlSeconds: z.number().int().min(60).max(900).optional(),
});

export const storefrontOtpRequestSchema = z.object({
  channel: z.enum(OTP_CHANNELS),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
});

export const storefrontOtpVerifySchema = storefrontOtpRequestSchema.extend({
  code: z.string().trim().min(4).max(12),
  name: z.string().trim().min(1).max(160).optional(),
});

export const storefrontGoogleExchangeSchema = z.object({
  ticket: z.string().trim().min(8).max(512),
});

export type UpdateAuthSettingsInput = z.infer<typeof updateAuthSettingsSchema>;
export type StorefrontOtpRequestInput = z.infer<typeof storefrontOtpRequestSchema>;
export type StorefrontOtpVerifyInput = z.infer<typeof storefrontOtpVerifySchema>;
