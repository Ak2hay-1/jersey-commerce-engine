'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StorefrontBootstrap, StorefrontChromeConfig, StorefrontFooter, StorefrontTheme } from '@jersey-commerce/types';
import { DEFAULT_STOREFRONT_CHROME, DEFAULT_STOREFRONT_FOOTER } from '@jersey-commerce/types';
import { DEFAULT_STORE_CHROME, type StoreChrome } from '../../lib/swatch';
import { themeStyleVars } from '../../lib/theme';

export const CUSTOMIZER_DRAFT_MESSAGE = 'jce:storefront-draft';

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
    homepage?: { sections?: StorefrontBootstrap['website']['homepage']['sections'] };
    footer?: Partial<StorefrontFooter>;
    chrome?: Partial<StorefrontChromeConfig>;
  };
};

const StoreContext = createContext<StorefrontBootstrap | null>(null);
const ChromeContext = createContext<StoreChrome>(DEFAULT_STORE_CHROME);
const DraftApplyContext = createContext<(draft: CustomizerDraftPayload | null) => void>(() => undefined);

function mergeBootstrap(base: StorefrontBootstrap, draft: CustomizerDraftPayload | null): StorefrontBootstrap {
  if (!draft) {
    return base;
  }
  const theme: StorefrontTheme = {
    ...base.theme,
    ...(draft.theme?.logo !== undefined ? { logo: draft.theme.logo } : {}),
    ...(draft.theme?.favicon !== undefined ? { favicon: draft.theme.favicon } : {}),
    ...(draft.theme?.primaryColor ? { primaryColor: draft.theme.primaryColor } : {}),
    ...(draft.theme?.secondaryColor ? { secondaryColor: draft.theme.secondaryColor } : {}),
    ...(draft.theme?.accentColor ? { accentColor: draft.theme.accentColor } : {}),
    ...(draft.theme?.backgroundColor ? { backgroundColor: draft.theme.backgroundColor } : {}),
    ...(draft.theme?.foregroundColor ? { foregroundColor: draft.theme.foregroundColor } : {}),
  };
  const chrome: StorefrontChromeConfig = {
    announcementMessages:
      draft.website?.chrome?.announcementMessages?.filter(Boolean).length
        ? (draft.website.chrome.announcementMessages.filter(Boolean) as string[])
        : (base.website.chrome?.announcementMessages ?? DEFAULT_STOREFRONT_CHROME.announcementMessages),
    headerNav:
      draft.website?.chrome?.headerNav?.length
        ? draft.website.chrome.headerNav
        : (base.website.chrome?.headerNav ?? DEFAULT_STOREFRONT_CHROME.headerNav),
  };
  const footer: StorefrontFooter = {
    ...DEFAULT_STOREFRONT_FOOTER,
    ...base.website.footer,
    ...draft.website?.footer,
  };
  return {
    ...base,
    theme,
    website: {
      ...base.website,
      seoTitle: draft.website?.seoTitle !== undefined ? draft.website.seoTitle : base.website.seoTitle,
      seoDescription:
        draft.website?.seoDescription !== undefined ? draft.website.seoDescription : base.website.seoDescription,
      contactPhone: draft.website?.contactPhone !== undefined ? draft.website.contactPhone : base.website.contactPhone,
      contactEmail: draft.website?.contactEmail !== undefined ? draft.website.contactEmail : base.website.contactEmail,
      contactAddress:
        draft.website?.contactAddress !== undefined ? draft.website.contactAddress : base.website.contactAddress,
      socialLinks: draft.website?.socialLinks ?? base.website.socialLinks,
      homepage: draft.website?.homepage?.sections
        ? { sections: draft.website.homepage.sections }
        : base.website.homepage,
      footer,
      chrome,
    },
  };
}

export function StoreProvider({
  value,
  chrome = DEFAULT_STORE_CHROME,
  children,
}: {
  value: StorefrontBootstrap;
  chrome?: StoreChrome;
  children: React.ReactNode;
}): React.JSX.Element {
  const [draft, setDraft] = useState<CustomizerDraftPayload | null>(null);
  const merged = useMemo(() => mergeBootstrap(value, draft), [value, draft]);

  useEffect(() => {
    const vars = themeStyleVars(merged.theme);
    for (const [key, next] of Object.entries(vars)) {
      document.body.style.setProperty(key, next);
    }
  }, [merged.theme]);

  const applyDraft = useCallback((next: CustomizerDraftPayload | null) => {
    setDraft(next);
  }, []);

  return (
    <StoreContext.Provider value={merged}>
      <DraftApplyContext.Provider value={applyDraft}>
        <ChromeContext.Provider value={chrome}>{children}</ChromeContext.Provider>
      </DraftApplyContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore(): StorefrontBootstrap {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error('StoreProvider is required.');
  }
  return value;
}

export function useStoreChrome(): StoreChrome {
  return useContext(ChromeContext);
}

function isAllowedCustomizerOrigin(origin: string): boolean {
  const configured = (process.env.NEXT_PUBLIC_CUSTOMIZER_PARENT_ORIGINS || process.env.NEXT_PUBLIC_ADMIN_URL || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const defaults = ['http://localhost:3001', 'http://127.0.0.1:3001', 'https://admin.jerzyfy.in'];
  const allowed = configured.length ? configured : defaults;
  if (allowed.includes(origin)) {
    return true;
  }
  try {
    if (document.referrer) {
      return new URL(document.referrer).origin === origin;
    }
  } catch {
    // ignore invalid referrer
  }
  return false;
}

export function CustomizerBridge(): React.JSX.Element | null {
  const applyDraft = useContext(DraftApplyContext);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('customizer') !== '1') {
      return;
    }

    function onMessage(event: MessageEvent) {
      if (!isAllowedCustomizerOrigin(event.origin)) {
        return;
      }
      const data = event.data as { type?: string; payload?: CustomizerDraftPayload } | null;
      if (!data || data.type !== CUSTOMIZER_DRAFT_MESSAGE || !data.payload) {
        return;
      }
      applyDraft(data.payload);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [applyDraft]);

  return null;
}
