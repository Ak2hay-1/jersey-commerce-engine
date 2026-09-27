export interface NotificationSettings {
  tenantId: string;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  hasTelegramBotToken: boolean;
  notifyOrderCreated: boolean;
  notifyCustomOrderCreated: boolean;
  notifyPaymentConfirmed: boolean;
  notifyOrderStatusChanged: boolean;
  notifyPosSale: boolean;
  whatsappEnabled: boolean;
  hasMsg91AuthKey: boolean;
  whatsappIntegratedNumber: string | null;
  whatsappTemplateName: string;
  whatsappTemplateNamespace: string | null;
  whatsappTemplateLanguage: string;
  whatsappPublicBaseUrl: string | null;
  whatsappSendPosReceipt: boolean;
  whatsappSendOrderReceipt: boolean;
  secretsEncryptionConfigured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateNotificationSettingsInput {
  telegramEnabled: boolean;
  telegramChatId?: string | null;
  /** Leave blank to keep the existing token. Send null to clear. */
  telegramBotToken?: string | null;
  notifyOrderCreated: boolean;
  notifyCustomOrderCreated: boolean;
  notifyPaymentConfirmed: boolean;
  notifyOrderStatusChanged: boolean;
  notifyPosSale: boolean;
  whatsappEnabled?: boolean;
  /** Leave blank to keep the existing key. Send null to clear. */
  msg91AuthKey?: string | null;
  whatsappIntegratedNumber?: string | null;
  whatsappTemplateName?: string;
  whatsappTemplateNamespace?: string | null;
  whatsappTemplateLanguage?: string;
  whatsappPublicBaseUrl?: string | null;
  whatsappSendPosReceipt?: boolean;
  whatsappSendOrderReceipt?: boolean;
}

export type WhatsappMessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface WhatsappReceiptStatus {
  status: WhatsappMessageStatus | null;
  phone: string | null;
  error: string | null;
  attempts: number;
  updatedAt: string | null;
}
