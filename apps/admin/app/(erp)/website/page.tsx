'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, cn } from '@jersey-commerce/ui';
import {
  COLLECTION_TILE_SPEC,
  DEFAULT_STOREFRONT_CHROME,
  DEFAULT_STOREFRONT_FOOTER,
  HERO_BANNER_SPEC,
  HOMEPAGE_SECTION_TYPES,
  type CategoryDetail,
  type HomepageBannerSlide,
  type HomepageSection,
  type HomepageSectionType,
  type ProductListItem,
  type StorefrontChromeConfig,
  type StorefrontFooter,
} from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { getDefaultTenantSlug, getStorefrontUrl, resolveMediaUrl } from '@/lib/env';
import { PreviewFrame } from '@/components/storefront-customizer/preview-frame';
import {
  CUSTOMIZER_PANELS,
  type CustomizerDraftPayload,
  type CustomizerPanelId,
} from '@/components/storefront-customizer/types';

interface WebsiteSettings {
  seoTitle?: string | null;
  seoDescription?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  contactAddress?: string | null;
  logo?: string | null;
  favicon?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  homepageConfig?: { sections?: HomepageSection[] } | null;
  footerConfig?: StorefrontFooter | null;
  chromeConfig?: StorefrontChromeConfig | null;
  socialLinks?: Record<string, string | undefined> | null;
}

interface TileDraft {
  slug: string;
  name: string;
  image: string;
}

function emptySlide(): HomepageBannerSlide {
  return {
    id: crypto.randomUUID(),
    image: '',
    heading: '',
    subheading: '',
    ctaLabel: 'Shop the drop',
    ctaHref: '/products',
  };
}

function sectionOf(sections: HomepageSection[], type: HomepageSection['type']): HomepageSection | undefined {
  return sections.find((section) => section.type === type);
}

function upsertSection(sections: HomepageSection[], next: HomepageSection): HomepageSection[] {
  const withoutMarquee = sections.filter((section) => section.type !== 'marquee');
  const index = withoutMarquee.findIndex((section) => section.type === next.type);
  if (index === -1) {
    return [...withoutMarquee, next];
  }
  return withoutMarquee.map((section, current) => (current === index ? { ...section, ...next } : section));
}

function withHeroFirst(sections: HomepageSection[]): HomepageSection[] {
  const heroes = sections.filter((section) => section.type === 'hero');
  const rest = sections.filter((section) => section.type !== 'hero');
  return [...heroes, ...rest];
}

async function loadRows<T>(path: string): Promise<T[]> {
  const result = await apiRequest<T[] | { items: T[] }>(path);
  if (Array.isArray(result)) {
    return result;
  }
  return result.items ?? [];
}

async function uploadWebsiteImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const stored = await apiRequest<{ url: string }>('/website/media', { method: 'POST', body });
  return stored.url;
}

const SECTION_LABELS: Partial<Record<HomepageSectionType, string>> = {
  hero: 'Hero banner',
  statement: 'Brand line',
  'featured-categories': 'Collections',
  'featured-products': 'Featured products',
  'new-arrivals': 'Latest drop',
  'promo-banner': 'Promo banner',
  'best-sellers': 'Best sellers',
  trust: 'Trust',
  cta: 'CTA',
};

export default function WebsitePage(): React.JSX.Element {
  const auth = useAuth();
  const canEdit = auth.can('website.update');
  const [panel, setPanel] = useState<CustomizerPanelId>('branding');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryDetail[]>([]);
  const [tiles, setTiles] = useState<TileDraft[]>([]);
  const [footer, setFooter] = useState<StorefrontFooter>(DEFAULT_STOREFRONT_FOOTER);
  const [chrome, setChrome] = useState<StorefrontChromeConfig>(DEFAULT_STOREFRONT_CHROME);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: '',
    facebook: '',
    twitter: '',
    youtube: '',
    whatsapp: '',
  });

  const hero = sectionOf(sections, 'hero');
  const statement = sectionOf(sections, 'statement');
  const latest = sectionOf(sections, 'new-arrivals');
  const featured = sectionOf(sections, 'featured-products');
  const collections = sectionOf(sections, 'featured-categories');
  const slides = hero?.slides?.length
    ? hero.slides
    : [
        {
          id: 'legacy-hero',
          image: hero?.image ?? '',
          heading: hero?.heading ?? '',
          subheading: hero?.subheading ?? '',
          ctaLabel: hero?.ctaLabel ?? 'Shop the drop',
          ctaHref: hero?.ctaHref ?? '/products',
        },
      ];

  useEffect(() => {
    Promise.all([
      apiRequest<WebsiteSettings>('/website/settings'),
      loadRows<ProductListItem>(`/products${queryString({ page: 1, pageSize: 100, status: 'ACTIVE' })}`),
      loadRows<CategoryDetail>(`/categories${queryString({ page: 1, pageSize: 100, status: 'ACTIVE' })}`),
    ])
      .then(([nextSettings, nextProducts, nextCategories]) => {
        setSettings(nextSettings);
        setProducts(nextProducts);
        setCategories(nextCategories);
        setFooter({ ...DEFAULT_STOREFRONT_FOOTER, ...(nextSettings.footerConfig ?? {}) });
        setChrome({
          ...DEFAULT_STOREFRONT_CHROME,
          ...(nextSettings.chromeConfig ?? {}),
          announcementMessages:
            nextSettings.chromeConfig?.announcementMessages?.length
              ? nextSettings.chromeConfig.announcementMessages
              : DEFAULT_STOREFRONT_CHROME.announcementMessages,
          headerNav:
            nextSettings.chromeConfig?.headerNav?.length
              ? nextSettings.chromeConfig.headerNav
              : DEFAULT_STOREFRONT_CHROME.headerNav,
        });
        setSocialLinks({
          instagram: nextSettings.socialLinks?.instagram ?? '',
          facebook: nextSettings.socialLinks?.facebook ?? '',
          twitter: nextSettings.socialLinks?.twitter ?? '',
          youtube: nextSettings.socialLinks?.youtube ?? '',
          whatsapp: nextSettings.socialLinks?.whatsapp ?? '',
        });
        const nextSections = nextSettings.homepageConfig?.sections ?? [];
        setSections(nextSections);
        const featuredSection = nextSections.find((section) => section.type === 'featured-categories');
        const selected = featuredSection?.categorySlugs?.length
          ? featuredSection.categorySlugs
          : nextCategories.filter((item) => !item.parentId).slice(0, 3).map((item) => item.slug);
        setTiles(
          selected.map((slug) => {
            const category = nextCategories.find((item) => item.slug === slug);
            return { slug, name: category?.name ?? slug, image: category?.image ?? '' };
          }),
        );
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  function patchSection(type: HomepageSection['type'], patch: Partial<HomepageSection>): void {
    setSections((current) =>
      upsertSection(current, {
        type,
        enabled: true,
        ...sectionOf(current, type),
        ...patch,
      }),
    );
  }

  function updateSlide(index: number, patch: Partial<HomepageBannerSlide>): void {
    const next = slides.map((slide, current) => (current === index ? { ...slide, ...patch } : slide));
    patchSection('hero', {
      slides: next,
      heading: next[0]?.heading,
      subheading: next[0]?.subheading,
      ctaLabel: next[0]?.ctaLabel,
      ctaHref: next[0]?.ctaHref,
      image: next[0]?.image,
    });
  }

  const draft: CustomizerDraftPayload = useMemo(
    () => ({
      theme: {
        logo: settings?.logo,
        favicon: settings?.favicon,
        primaryColor: settings?.primaryColor,
        secondaryColor: settings?.secondaryColor,
        accentColor: settings?.accentColor,
        backgroundColor: settings?.backgroundColor,
        foregroundColor: settings?.foregroundColor,
      },
      website: {
        seoTitle: settings?.seoTitle,
        seoDescription: settings?.seoDescription,
        contactPhone: settings?.contactPhone,
        contactEmail: settings?.contactEmail,
        contactAddress: settings?.contactAddress,
        socialLinks: Object.fromEntries(
          Object.entries(socialLinks)
            .map(([key, value]) => [key, value.trim()])
            .filter(([, value]) => value),
        ),
        homepage: { sections: withHeroFirst(sections.filter((section) => section.type !== 'marquee')) },
        footer,
        chrome,
      },
    }),
    [chrome, footer, sections, settings, socialLinks],
  );

  async function onSave(): Promise<void> {
    if (!canEdit) {
      return;
    }
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const nextSections = upsertSection(sections, {
        type: 'featured-categories',
        enabled: collections?.enabled ?? true,
        heading: collections?.heading || 'Premium collection',
        categorySlugs: tiles.map((tile) => tile.slug),
      });
      await Promise.all(
        tiles.map(async (tile) => {
          const category = categories.find((item) => item.slug === tile.slug);
          if (!category) {
            return;
          }
          if (category.name === tile.name && (category.image ?? '') === tile.image) {
            return;
          }
          await apiRequest(`/categories/${category.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: tile.name, image: tile.image || null }),
          });
        }),
      );
      const updated = await apiRequest<WebsiteSettings>('/website/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          seoTitle: settings?.seoTitle,
          seoDescription: settings?.seoDescription,
          contactPhone: settings?.contactPhone,
          contactEmail: settings?.contactEmail,
          contactAddress: settings?.contactAddress,
          logo: settings?.logo ?? null,
          favicon: settings?.favicon ?? null,
          primaryColor: settings?.primaryColor ?? null,
          secondaryColor: settings?.secondaryColor ?? null,
          accentColor: settings?.accentColor ?? null,
          backgroundColor: settings?.backgroundColor ?? null,
          foregroundColor: settings?.foregroundColor ?? null,
          homepageConfig: { sections: withHeroFirst(nextSections.filter((section) => section.type !== 'marquee')) },
          footerConfig: {
            ...footer,
            materials: footer.materials.map((item) => item.trim()).filter(Boolean),
          },
          chromeConfig: {
            announcementMessages: chrome.announcementMessages.map((item) => item.trim()).filter(Boolean),
            headerNav: chrome.headerNav.filter((item) => item.href.trim() && item.label.trim()),
          },
          socialLinks: Object.fromEntries(
            Object.entries(socialLinks)
              .map(([key, value]) => [key, value.trim()])
              .filter(([, value]) => value),
          ),
        }),
      });
      setSettings(updated);
      setSections(updated.homepageConfig?.sections ?? nextSections);
      setFooter({ ...DEFAULT_STOREFRONT_FOOTER, ...(updated.footerConfig ?? footer) });
      setChrome({
        ...DEFAULT_STOREFRONT_CHROME,
        ...(updated.chromeConfig ?? chrome),
      });
      setSaved('Storefront saved.');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save storefront');
    } finally {
      setSaving(false);
    }
  }

  const storefrontUrl = getStorefrontUrl();
  const tenantSlug = getDefaultTenantSlug();
  const editableSections = HOMEPAGE_SECTION_TYPES.filter((type) => type !== 'marquee');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customize storefront"
        description="Edit branding, chrome, and homepage sections with a live preview."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <a href={storefrontUrl} target="_blank" rel="noreferrer">
                Open live site
              </a>
            </Button>
            <Button type="button" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>
              Refresh preview
            </Button>
            {canEdit ? (
              <Button type="button" onClick={() => void onSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </div>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {CUSTOMIZER_PANELS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium',
                  panel === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
                )}
                onClick={() => setPanel(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 rounded-md border p-3 text-sm">
            {panel === 'branding' ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">Logo appears in the storefront header.</p>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Shop logo</Label>
                    {settings?.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(settings.logo)} alt="" className="h-20 w-20 rounded border object-contain p-2" />
                    ) : null}
                    {canEdit ? (
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void uploadWebsiteImage(file)
                            .then((url) => setSettings((current) => (current ? { ...current, logo: url } : current)))
                            .catch((err: Error) => setError(err.message));
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    {settings?.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(settings.favicon)} alt="" className="h-10 w-10 rounded border object-contain p-1" />
                    ) : null}
                    {canEdit ? (
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void uploadWebsiteImage(file)
                            .then((url) => setSettings((current) => (current ? { ...current, favicon: url } : current)))
                            .catch((err: Error) => setError(err.message));
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {panel === 'theme' ? (
              <div className="grid gap-3">
                {(
                  [
                    ['primaryColor', 'Primary'],
                    ['secondaryColor', 'Secondary'],
                    ['accentColor', 'Accent'],
                    ['backgroundColor', 'Background'],
                    ['foregroundColor', 'Foreground'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key}>{label}</Label>
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        type="color"
                        className="h-10 w-14 p-1"
                        value={settings?.[key] || '#111111'}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setSettings((current) => (current ? { ...current, [key]: event.target.value } : current))
                        }
                      />
                      <Input
                        value={settings?.[key] || ''}
                        disabled={!canEdit}
                        placeholder="#111111"
                        onChange={(event) =>
                          setSettings((current) => (current ? { ...current, [key]: event.target.value } : current))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {panel === 'seo' ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="seoTitle">SEO title</Label>
                  <Input
                    id="seoTitle"
                    value={settings?.seoTitle ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, seoTitle: event.target.value } : current))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="seoDescription">SEO description</Label>
                  <textarea
                    id="seoDescription"
                    className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    value={settings?.seoDescription ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, seoDescription: event.target.value } : current))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    value={settings?.contactPhone ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, contactPhone: event.target.value } : current))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    value={settings?.contactEmail ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, contactEmail: event.target.value } : current))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactAddress">Address</Label>
                  <Input
                    id="contactAddress"
                    value={settings?.contactAddress ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, contactAddress: event.target.value } : current))
                    }
                  />
                </div>
              </div>
            ) : null}

            {panel === 'announcement' ? (
              <div className="space-y-3">
                <p className="text-muted-foreground">Rotating messages in the top bar.</p>
                {chrome.announcementMessages.map((message, index) => (
                  <div key={`msg-${index}`} className="flex gap-2">
                    <Input
                      value={message}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setChrome((current) => ({
                          ...current,
                          announcementMessages: current.announcementMessages.map((item, i) =>
                            i === index ? event.target.value : item,
                          ),
                        }))
                      }
                    />
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setChrome((current) => ({
                            ...current,
                            announcementMessages: current.announcementMessages.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChrome((current) => ({
                        ...current,
                        announcementMessages: [...current.announcementMessages, 'New announcement'],
                      }))
                    }
                  >
                    Add message
                  </Button>
                ) : null}
              </div>
            ) : null}

            {panel === 'header' ? (
              <div className="space-y-3">
                {chrome.headerNav.map((item, index) => (
                  <div key={`nav-${index}`} className="space-y-2 rounded border p-2">
                    <Input
                      value={item.label}
                      disabled={!canEdit}
                      placeholder="Label"
                      onChange={(event) =>
                        setChrome((current) => ({
                          ...current,
                          headerNav: current.headerNav.map((row, i) =>
                            i === index ? { ...row, label: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                    <Input
                      value={item.href}
                      disabled={!canEdit}
                      placeholder="/products"
                      onChange={(event) =>
                        setChrome((current) => ({
                          ...current,
                          headerNav: current.headerNav.map((row, i) =>
                            i === index ? { ...row, href: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setChrome((current) => ({
                            ...current,
                            headerNav: current.headerNav.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setChrome((current) => ({
                        ...current,
                        headerNav: [...current.headerNav, { href: '/products', label: 'Link' }],
                      }))
                    }
                  >
                    Add link
                  </Button>
                ) : null}
              </div>
            ) : null}

            {panel === 'hero' ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {HERO_BANNER_SPEC.width}×{HERO_BANNER_SPEC.height} ({HERO_BANNER_SPEC.ratio}).
                </p>
                {slides.map((slide, index) => (
                  <div key={slide.id ?? `slide-${index}`} className="space-y-2 rounded border p-2">
                    <p className="font-medium">Slide {index + 1}</p>
                    {slide.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(slide.image)} alt="" className="h-24 w-full rounded object-cover" />
                    ) : null}
                    <Input value={slide.heading ?? ''} disabled={!canEdit} placeholder="Title" onChange={(e) => updateSlide(index, { heading: e.target.value })} />
                    <Input value={slide.subheading ?? ''} disabled={!canEdit} placeholder="Subtitle" onChange={(e) => updateSlide(index, { subheading: e.target.value })} />
                    <Input value={slide.ctaLabel ?? ''} disabled={!canEdit} placeholder="Button label" onChange={(e) => updateSlide(index, { ctaLabel: e.target.value })} />
                    <Input value={slide.ctaHref ?? ''} disabled={!canEdit} placeholder="Button link" onChange={(e) => updateSlide(index, { ctaHref: e.target.value })} />
                    {canEdit ? (
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void uploadWebsiteImage(file)
                            .then((url) => updateSlide(index, { image: url }))
                            .catch((err: Error) => setError(err.message));
                        }}
                      />
                    ) : null}
                  </div>
                ))}
                {canEdit ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => patchSection('hero', { slides: [...slides, emptySlide()] })}>
                    Add slide
                  </Button>
                ) : null}
              </div>
            ) : null}

            {panel === 'sections' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Brand line</Label>
                  <Input
                    value={statement?.heading ?? ''}
                    disabled={!canEdit}
                    onChange={(event) => patchSection('statement', { heading: event.target.value })}
                  />
                  <Input
                    value={statement?.subheading ?? ''}
                    disabled={!canEdit}
                    onChange={(event) => patchSection('statement', { subheading: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Section visibility</Label>
                  {editableSections.map((type) => {
                    const section = sectionOf(sections, type);
                    return (
                      <label key={type} className="flex items-center justify-between gap-2 text-xs">
                        <span>{SECTION_LABELS[type] ?? type}</span>
                        <input
                          type="checkbox"
                          checked={section?.enabled ?? type === 'hero'}
                          disabled={!canEdit || type === 'hero'}
                          onChange={(event) =>
                            patchSection(type, {
                              enabled: event.target.checked,
                              heading: section?.heading,
                            })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <Label>Latest drop products</Label>
                  <select
                    multiple
                    className="min-h-28 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    disabled={!canEdit}
                    value={latest?.productSlugs ?? []}
                    onChange={(event) =>
                      patchSection('new-arrivals', {
                        productSlugs: Array.from(event.target.selectedOptions).map((option) => option.value),
                      })
                    }
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.slug}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Featured products</Label>
                  <select
                    multiple
                    className="min-h-28 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                    disabled={!canEdit}
                    value={featured?.productSlugs ?? []}
                    onChange={(event) =>
                      patchSection('featured-products', {
                        productSlugs: Array.from(event.target.selectedOptions).map((option) => option.value),
                      })
                    }
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.slug}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Collection tiles ({COLLECTION_TILE_SPEC.ratio})</Label>
                  <Input
                    value={collections?.heading ?? ''}
                    disabled={!canEdit}
                    placeholder="Section title"
                    onChange={(event) => patchSection('featured-categories', { heading: event.target.value })}
                  />
                  {tiles.map((tile, index) => (
                    <div key={tile.slug} className="space-y-1 rounded border p-2">
                      <select
                        className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                        disabled={!canEdit}
                        value={tile.slug}
                        onChange={(event) => {
                          const slug = event.target.value;
                          const category = categories.find((item) => item.slug === slug);
                          setTiles((current) =>
                            current.map((row, i) =>
                              i === index
                                ? { slug, name: category?.name ?? slug, image: category?.image ?? row.image }
                                : row,
                            ),
                          );
                        }}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={tile.name}
                        disabled={!canEdit}
                        onChange={(event) =>
                          setTiles((current) =>
                            current.map((row, i) => (i === index ? { ...row, name: event.target.value } : row)),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {panel === 'footer' ? (
              <div className="grid gap-3">
                <Input value={footer.kicker} disabled={!canEdit} placeholder="Kicker" onChange={(e) => setFooter((c) => ({ ...c, kicker: e.target.value }))} />
                <Input value={footer.heading} disabled={!canEdit} placeholder="Heading" onChange={(e) => setFooter((c) => ({ ...c, heading: e.target.value }))} />
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={footer.body}
                  disabled={!canEdit}
                  placeholder="Body"
                  onChange={(e) => setFooter((c) => ({ ...c, body: e.target.value }))}
                />
                <Input value={footer.copyright} disabled={!canEdit} placeholder="Copyright" onChange={(e) => setFooter((c) => ({ ...c, copyright: e.target.value }))} />
                {(['instagram', 'facebook', 'twitter', 'youtube', 'whatsapp'] as const).map((key) => (
                  <Input
                    key={key}
                    value={socialLinks[key]}
                    disabled={!canEdit}
                    placeholder={key}
                    onChange={(event) => setSocialLinks((current) => ({ ...current, [key]: event.target.value }))}
                  />
                ))}
              </div>
            ) : null}

            {panel === 'about' ? (
              <div className="grid gap-3">
                <Input
                  value={footer.aboutTitle}
                  disabled={!canEdit}
                  placeholder="About title"
                  onChange={(e) => setFooter((c) => ({ ...c, aboutTitle: e.target.value }))}
                />
                <textarea
                  className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={footer.aboutBody}
                  disabled={!canEdit}
                  placeholder="About body (paragraphs separated by blank lines)"
                  onChange={(e) => setFooter((c) => ({ ...c, aboutBody: e.target.value }))}
                />
                <Input
                  value={footer.materialsTitle}
                  disabled={!canEdit}
                  placeholder="Materials title"
                  onChange={(e) => setFooter((c) => ({ ...c, materialsTitle: e.target.value }))}
                />
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={footer.materials.join('\n')}
                  disabled={!canEdit}
                  placeholder="One material line per row"
                  onChange={(e) =>
                    setFooter((c) => ({
                      ...c,
                      materials: e.target.value.split('\n'),
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
        </aside>

        <PreviewFrame
          storefrontUrl={storefrontUrl}
          tenantSlug={tenantSlug}
          draft={draft}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
