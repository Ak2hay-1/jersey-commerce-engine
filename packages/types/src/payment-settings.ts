export interface PaymentSettings {
  tenantId: string;
  razorpayEnabled: boolean;
  razorpayKeyId: string | null;
  hasRazorpayKeySecret: boolean;
  secretsEncryptionConfigured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdatePaymentSettingsInput {
  razorpayEnabled: boolean;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
}

export interface StorefrontPaymentMethods {
  razorpay: boolean;
  razorpayKeyId: string | null;
}
