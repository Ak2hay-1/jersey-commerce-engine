'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@jersey-commerce/ui';
import {
  COLLECTION_TILE_SPEC,
  DEFAULT_STOREFRONT_FOOTER,
  HERO_BANNER_SPEC,
  type CategoryDetail,
  type HomepageBannerSlide,
  type HomepageSection,
  type ProductListItem,
  type StorefrontFooter,
} from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/env';

interface WebsiteSettings {
  seoTitle?: string | null;
  seoDescription?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  logo?: string | null;
  favicon?: string | null;
  homepageConfig?: { sections?: HomepageSection[] } | null;
  footerConfig?: StorefrontFooter | null;
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

export default function WebsitePage(): React.JSX.Element {
  const auth = useAuth();
  const canEdit = auth.can('website.update');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<CategoryDetail[]>([]);
  const [tiles, setTiles] = useState<TileDraft[]>([]);
  const [footer, setFooter] = useState<StorefrontFooter>(DEFAULT_STOREFRONT_FOOTER);
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

  const productOptions = useMemo(
    () => products.map((product) => ({ slug: product.slug, name: product.name })),
    [products],
  );

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
      image: next[0]?.image,
      heading: next[0]?.heading,
      subheading: next[0]?.subheading,
      ctaLabel: next[0]?.ctaLabel,
      ctaHref: next[0]?.ctaHref,
    });
  }

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
        enabled: true,
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
          logo: settings?.logo ?? null,
          favicon: settings?.favicon ?? null,
          homepageConfig: { sections: nextSections.filter((section) => section.type !== 'marquee') },
          footerConfig: {
            ...footer,
            materials: footer.materials.map((item) => item.trim()).filter(Boolean),
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
      setSaved('Website saved. Refresh the storefront to see the changes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save website');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website"
        description="Edit homepage banners, featured products, and the storefront footer."
        actions={
          canEdit ? (
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save website'}
            </Button>
          ) : null
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 text-sm">
          <p className="text-muted-foreground">
            Logo appears in the storefront header and splash screen. Use a square PNG with a light background.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Shop logo</Label>
              {settings?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(settings.logo)} alt="" className="h-24 w-24 rounded border bg-muted object-contain p-2" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                  No logo
                </div>
              )}
              {canEdit ? (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void uploadWebsiteImage(file)
                      .then((url) => setSettings((current) => (current ? { ...current, logo: url } : current)))
                      .catch((err: Error) => setError(err.message));
                  }}
                />
              ) : null}
              {canEdit && settings?.logo ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => (current ? { ...current, logo: null } : current))}>
                  Remove logo
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Favicon</Label>
              {settings?.favicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(settings.favicon)} alt="" className="h-12 w-12 rounded border bg-muted object-contain p-1" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                  None
                </div>
              )}
              {canEdit ? (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void uploadWebsiteImage(file)
                      .then((url) => setSettings((current) => (current ? { ...current, favicon: url } : current)))
                      .catch((err: Error) => setError(err.message));
                  }}
                />
              ) : null}
              {canEdit && settings?.favicon ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSettings((current) => (current ? { ...current, favicon: null } : current))}>
                  Remove favicon
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Hero banners (slider)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 text-sm">
          <p className="text-muted-foreground">
            Upload <strong>{HERO_BANNER_SPEC.width} × {HERO_BANNER_SPEC.height}px</strong> artwork at{' '}
            <strong>{HERO_BANNER_SPEC.ratio}</strong>. {HERO_BANNER_SPEC.mimeHint}. Each slide has its own title and button.
          </p>
          {slides.map((slide, index) => (
            <div key={slide.id ?? `slide-${index}`} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Slide {index + 1}</p>
                {canEdit && slides.length > 1 ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => patchSection('hero', { slides: slides.filter((_, current) => current !== index) })}>
                    Remove
                  </Button>
                ) : null}
              </div>
              {slide.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(slide.image)} alt="" className="h-28 w-full rounded object-cover" />
              ) : (
                <div className="flex h-28 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  {HERO_BANNER_SPEC.ratio} · {HERO_BANNER_SPEC.width}×{HERO_BANNER_SPEC.height}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`slide-title-${index}`}>Title</Label>
                  <Input id={`slide-title-${index}`} value={slide.heading ?? ''} disabled={!canEdit} onChange={(event) => updateSlide(index, { heading: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`slide-sub-${index}`}>Subtitle</Label>
                  <Input id={`slide-sub-${index}`} value={slide.subheading ?? ''} disabled={!canEdit} onChange={(event) => updateSlide(index, { subheading: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`slide-cta-${index}`}>Button label</Label>
                  <Input id={`slide-cta-${index}`} value={slide.ctaLabel ?? ''} disabled={!canEdit} onChange={(event) => updateSlide(index, { ctaLabel: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`slide-href-${index}`}>Button link</Label>
                  <Input id={`slide-href-${index}`} value={slide.ctaHref ?? ''} disabled={!canEdit} onChange={(event) => updateSlide(index, { ctaHref: event.target.value })} />
                </div>
              </div>
              {canEdit ? (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void uploadWebsiteImage(file)
                      .then((url) => updateSlide(index, { image: url }))
                      .catch((err: Error) => setError(err.message));
                  }}
                />
              ) : null}
            </div>
          ))}
          {canEdit ? (
            <Button type="button" variant="outline" onClick={() => patchSection('hero', { slides: [...slides, emptySlide()] })}>
              Add banner slide
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Brand line</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="statement-heading">Headline</Label>
            <Input
              id="statement-heading"
              value={statement?.heading ?? ''}
              disabled={!canEdit}
              onChange={(event) => patchSection('statement', { heading: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="statement-sub">Supporting line</Label>
            <Input
              id="statement-sub"
              value={statement?.subheading ?? ''}
              disabled={!canEdit}
              onChange={(event) => patchSection('statement', { subheading: event.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Latest drop products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm">
          <p className="text-muted-foreground">Leave none selected to auto-show the newest products.</p>
          <ProductPicker
            products={productOptions}
            selected={latest?.productSlugs ?? []}
            disabled={!canEdit}
            onChange={(productSlugs) => patchSection('new-arrivals', { heading: latest?.heading || 'Latest drop', productSlugs })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Featured products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm">
          <p className="text-muted-foreground">Leave none selected to auto-show products marked featured.</p>
          <ProductPicker
            products={productOptions}
            selected={featured?.productSlugs ?? []}
            disabled={!canEdit}
            onChange={(productSlugs) => patchSection('featured-products', { heading: featured?.heading || 'Featured products', productSlugs })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Premium collection tiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 text-sm">
          <p className="text-muted-foreground">
            Tile images should be <strong>{COLLECTION_TILE_SPEC.width} × {COLLECTION_TILE_SPEC.height}px</strong> at{' '}
            <strong>{COLLECTION_TILE_SPEC.ratio}</strong>.
          </p>
          <div className="space-y-1">
            <Label htmlFor="collections-heading">Section title</Label>
            <Input
              id="collections-heading"
              value={collections?.heading ?? ''}
              disabled={!canEdit}
              onChange={(event) => patchSection('featured-categories', { heading: event.target.value, categorySlugs: tiles.map((tile) => tile.slug) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tile-add">Add a category tile</Label>
            <select
              id="tile-add"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              disabled={!canEdit}
              value=""
              onChange={(event) => {
                const slug = event.target.value;
                if (!slug || tiles.some((tile) => tile.slug === slug)) {
                  return;
                }
                const category = categories.find((item) => item.slug === slug);
                setTiles((current) => [...current, { slug, name: category?.name ?? slug, image: category?.image ?? '' }]);
              }}
            >
              <option value="">Select a category…</option>
              {categories
                .filter((category) => !tiles.some((tile) => tile.slug === category.slug))
                .map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
          {tiles.map((tile, index) => (
            <div key={tile.slug} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{tile.name}</p>
                {canEdit ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setTiles((current) => current.filter((item) => item.slug !== tile.slug))}>
                    Remove
                  </Button>
                ) : null}
              </div>
              {tile.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveMediaUrl(tile.image)} alt="" className="h-40 w-32 rounded object-cover" />
              ) : (
                <div className="flex h-40 w-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  {COLLECTION_TILE_SPEC.ratio}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor={`tile-name-${tile.slug}`}>Tile title</Label>
                <Input
                  id={`tile-name-${tile.slug}`}
                  value={tile.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setTiles((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, name: event.target.value } : item)))
                  }
                />
              </div>
              {canEdit ? (
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    void uploadWebsiteImage(file)
                      .then((url) => setTiles((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, image: url } : item))))
                      .catch((err: Error) => setError(err.message));
                  }}
                />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Storefront footer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
          <p className="text-sm text-muted-foreground md:col-span-2">
            These fields replace the hardcoded footer copy on the public storefront. Leave a field blank to keep the default line.
          </p>
          <div className="space-y-1">
            <Label htmlFor="footer-kicker">Kicker</Label>
            <Input id="footer-kicker" value={footer.kicker} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, kicker: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-heading">Headline</Label>
            <Input id="footer-heading" value={footer.heading} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, heading: event.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="footer-body">Intro</Label>
            <textarea
              id="footer-body"
              className="min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={footer.body}
              disabled={!canEdit}
              onChange={(event) => setFooter((current) => ({ ...current, body: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-about-title">About title</Label>
            <Input id="footer-about-title" value={footer.aboutTitle} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, aboutTitle: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-materials-title">Materials title</Label>
            <Input id="footer-materials-title" value={footer.materialsTitle} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, materialsTitle: event.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="footer-about">About copy</Label>
            <textarea
              id="footer-about"
              className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={footer.aboutBody}
              disabled={!canEdit}
              onChange={(event) => setFooter((current) => ({ ...current, aboutBody: event.target.value }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="footer-materials">Materials (one line each)</Label>
            <textarea
              id="footer-materials"
              className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={footer.materials.join('\n')}
              disabled={!canEdit}
              onChange={(event) => setFooter((current) => ({ ...current, materials: event.target.value.split('\n') }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-collections">Collections title</Label>
            <Input id="footer-collections" value={footer.collectionsTitle} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, collectionsTitle: event.target.value }))} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={footer.showCollections}
                disabled={!canEdit}
                onChange={(event) => setFooter((current) => ({ ...current, showCollections: event.target.checked }))}
              />
              Show featured collections
            </label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-shop">Shop title</Label>
            <Input id="footer-shop" value={footer.shopTitle} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, shopTitle: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-contact">Contact title</Label>
            <Input id="footer-contact" value={footer.contactTitle} disabled={!canEdit} onChange={(event) => setFooter((current) => ({ ...current, contactTitle: event.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="footer-copyright">Copyright line</Label>
            <Input
              id="footer-copyright"
              value={footer.copyright}
              disabled={!canEdit}
              placeholder="Leave blank to use © year store name"
              onChange={(event) => setFooter((current) => ({ ...current, copyright: event.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Social profiles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
          <p className="text-sm text-muted-foreground md:col-span-2">
            Links appear in the storefront footer. Use full URLs (https://…).
          </p>
          {(['instagram', 'facebook', 'twitter', 'youtube', 'whatsapp'] as const).map((network) => (
            <div key={network} className="space-y-1">
              <Label htmlFor={`social-${network}`} className="capitalize">
                {network}
              </Label>
              <Input
                id={`social-${network}`}
                value={socialLinks[network]}
                disabled={!canEdit}
                placeholder={`https://${network === 'whatsapp' ? 'wa.me/…' : `${network}.com/…`}`}
                onChange={(event) => setSocialLinks((current) => ({ ...current, [network]: event.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProductPicker({
  products,
  selected,
  disabled,
  onChange,
}: {
  products: Array<{ slug: string; name: string }>;
  selected: string[];
  disabled: boolean;
  onChange: (slugs: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {products.map((product) => {
        const checked = selected.includes(product.slug);
        return (
          <label key={product.slug} className="flex items-center gap-2 rounded border px-3 py-2">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() =>
                onChange(checked ? selected.filter((slug) => slug !== product.slug) : [...selected, product.slug])
              }
            />
            <span>{product.name}</span>
          </label>
        );
      })}
    </div>
  );
}
