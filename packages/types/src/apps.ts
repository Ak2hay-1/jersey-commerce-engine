export const APPLICATION_NAMES = ['storefront', 'admin', 'pos', 'api'] as const;

export type ApplicationName = (typeof APPLICATION_NAMES)[number];
