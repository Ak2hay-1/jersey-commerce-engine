import type { DelhiveryEnvironment, DelhiveryServiceMode } from './enums';

export interface ShippingSettings {
  tenantId: string;
  delhiveryEnabled: boolean;
  hasDelhiveryApiToken: boolean;
  delhiveryEnvironment: DelhiveryEnvironment;
  delhiveryServiceMode: DelhiveryServiceMode;
  codEnabled: boolean;
  defaultPackageWeightKg: string;
  warehouseName: string | null;
  warehousePhone: string | null;
  warehouseAddress: string | null;
  warehouseCity: string | null;
  warehouseState: string | null;
  warehousePostalCode: string | null;
  warehouseCountry: string;
  pickupLocation: string | null;
  hasWebhookSecret: boolean;
  secretsEncryptionConfigured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateShippingSettingsInput {
  delhiveryEnabled: boolean;
  delhiveryApiToken?: string | null;
  delhiveryEnvironment: DelhiveryEnvironment;
  delhiveryServiceMode: DelhiveryServiceMode;
  codEnabled: boolean;
  defaultPackageWeightKg: string;
  warehouseName?: string | null;
  warehousePhone?: string | null;
  warehouseAddress?: string | null;
  warehouseCity?: string | null;
  warehouseState?: string | null;
  warehousePostalCode?: string | null;
  warehouseCountry?: string;
  pickupLocation?: string | null;
  webhookSecret?: string | null;
}

export interface ShippingRateOption {
  mode: DelhiveryServiceMode;
  amount: string;
  currency: string;
  estimatedDays: string | null;
}

export interface ShippingServiceability {
  postalCode: string;
  serviceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  message?: string;
}

export interface ShippingQuoteResult {
  serviceability: ShippingServiceability;
  rates: ShippingRateOption[];
  selectedMode: DelhiveryServiceMode | null;
  shippingAmount: string;
  calculationMode: 'FREE' | 'FIXED' | 'DELHIVERY' | 'PICKUP' | 'FREE_THRESHOLD';
}
