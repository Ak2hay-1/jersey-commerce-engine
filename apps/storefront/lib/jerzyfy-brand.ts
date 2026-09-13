/** Jerzyfy single-shop dark match-day brand lock (overrides stale CMS light themes). */

export const JERZYFY_DARK_MATCHDAY = {
  primaryColor: '#F5F5F4',
  secondaryColor: '#A8A29E',
  accentColor: '#7A1F1F',
  backgroundColor: '#0A0A0A',
  foregroundColor: '#F5F5F4',
} as const;

export type StoreThemeColors = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  headingFont: string;
  bodyFont: string;
};

export function applyJerzyfyDarkMatchday<T extends StoreThemeColors>(theme: T, singleTenant: boolean): T {
  if (!singleTenant) {
    return theme;
  }
  return {
    ...theme,
    ...JERZYFY_DARK_MATCHDAY,
  };
}
