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
}
