export const CUSTOMIZER_DRAFT_MESSAGE = 'jce:storefront-draft' as const;

import type { HomepageSection, StorefrontChromeConfig, StorefrontFooter } from '@jersey-commerce/types';

export type CustomizerDraftPayload = {
  theme?: {
    logo?: string | null;
    favicon?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    foregroundColor?: string | null;
  };
  website?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    contactAddress?: string | null;
    socialLinks?: Record<string, string>;
    homepage?: { sections?: HomepageSection[] };
    footer?: Partial<StorefrontFooter>;
    chrome?: Partial<StorefrontChromeConfig>;
  };
};

export type CustomizerPanelId =
  | 'branding'
  | 'theme'
  | 'seo'
  | 'announcement'
  | 'header'
  | 'hero'
  | 'sections'
  | 'footer'
  | 'about';

export const CUSTOMIZER_PANELS: Array<{ id: CustomizerPanelId; label: string }> = [
  { id: 'branding', label: 'Branding' },
  { id: 'theme', label: 'Theme' },
  { id: 'seo', label: 'SEO & contact' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'header', label: 'Header nav' },
  { id: 'hero', label: 'Hero' },
  { id: 'sections', label: 'Homepage sections' },
  { id: 'footer', label: 'Footer & socials' },
  { id: 'about', label: 'About' },
];
