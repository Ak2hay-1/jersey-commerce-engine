export const DEFAULT_CRM_SETTINGS = {
  highValueThreshold: 10000,
  inactiveDays: 90,
  newPurchaseCount: 1,
  repeatPurchaseCount: 2,
} as const;

export type CrmSettings = {
  highValueThreshold: number;
  inactiveDays: number;
  newPurchaseCount: number;
  repeatPurchaseCount: number;
};

export function resolveCrmSettings(overrides?: Partial<CrmSettings>): CrmSettings {
  return {
    highValueThreshold:
      overrides?.highValueThreshold != null && Number.isFinite(overrides.highValueThreshold)
        ? Math.max(0, overrides.highValueThreshold)
        : DEFAULT_CRM_SETTINGS.highValueThreshold,
    inactiveDays:
      overrides?.inactiveDays != null && Number.isFinite(overrides.inactiveDays)
        ? Math.max(1, Math.trunc(overrides.inactiveDays))
        : DEFAULT_CRM_SETTINGS.inactiveDays,
    newPurchaseCount:
      overrides?.newPurchaseCount != null && Number.isFinite(overrides.newPurchaseCount)
        ? Math.max(1, Math.trunc(overrides.newPurchaseCount))
        : DEFAULT_CRM_SETTINGS.newPurchaseCount,
    repeatPurchaseCount:
      overrides?.repeatPurchaseCount != null && Number.isFinite(overrides.repeatPurchaseCount)
        ? Math.max(2, Math.trunc(overrides.repeatPurchaseCount))
        : DEFAULT_CRM_SETTINGS.repeatPurchaseCount,
  };
}
