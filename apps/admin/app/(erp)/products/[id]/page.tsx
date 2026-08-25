'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { CategoryDetail, ProductDetail, ProductVariantDto } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/env';
import { statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface VariantDraft {
  id?: string;
  size: string;
  colour: string;
  sku: string;
  costPrice: string;
  sellingPrice: string;
  status: string;
}

type AngleSlot = 'front' | 'side' | 'back';

interface PendingImage {
  file: File;
  label: string;
  isPrimary: boolean;
  sortOrder: number;
}

function emptyVariant(): VariantDraft {
  return { size: '', colour: '', sku: '', costPrice: '', sellingPrice: '', status: 'ACTIVE' };
}

function fromApi(variant: ProductVariantDto): VariantDraft {
  return {
    id: variant.id,
    size: variant.size ?? '',
    colour: variant.colour ?? '',
    sku: variant.sku,
    costPrice: variant.costPrice,
    sellingPrice: variant.sellingPrice,
    status: variant.status,
  };
}

async function uploadProductImage(
  productId: string,
  file: File,
  options: { isPrimary?: boolean; sortOrder?: number },
): Promise<void> {
  const body = new FormData();
  body.append('file', file);
  if (options.isPrimary) {
    body.append('isPrimary', 'true');
  }
  if (options.sortOrder !== undefined) {
    body.append('sortOrder', String(options.sortOrder));
  }
  await apiRequest(`/products/${productId}/images`, { method: 'POST', body });
}

export default function ProductDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [categories, setCategories] = useState<CategoryDetail[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [featured, setFeatured] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [angleFiles, setAngleFiles] = useState<Partial<Record<AngleSlot, File>>>({});
  const [anglePreviews, setAnglePreviews] = useState<Partial<Record<AngleSlot, string>>>({});
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      for (const url of Object.values(anglePreviews)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
    };
  }, [anglePreviews]);

  function setAngleFile(slot: AngleSlot, file: File | undefined): void {
    setAnglePreviews((current) => {
      const previous = current[slot];
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      const next = { ...current };
      if (file) {
        next[slot] = URL.createObjectURL(file);
      } else {
        delete next[slot];
      }
      return next;
    });
    setAngleFiles((current) => {
      const next = { ...current };
      if (file) {
        next[slot] = file;
      } else {
        delete next[slot];
      }
      return next;
    });
  }

  async function loadProduct(id: string): Promise<void> {
    const row = await apiRequest<ProductDetail>(`/products/${id}`);
    setProduct(row);
    setName(row.name);
    setBrand(row.brand ?? '');
    setCategoryId(row.category?.id ?? '');
    setStatus(row.status);
    setFeatured(row.featured);
    setShortDescription(row.shortDescription ?? '');
    setDescription(row.description ?? '');
    setVariants(row.variants.length ? row.variants.map(fromApi) : [emptyVariant()]);
  }

  useEffect(() => {
    void apiRequest<{ items: CategoryDetail[] } | CategoryDetail[]>(
      `/categories${queryString({ page: 1, pageSize: 100, status: 'ACTIVE' })}`,
    ).then((result) => {
      setCategories(Array.isArray(result) ? result : (result.items ?? []));
    });
    if (!isNew) {
      loadProduct(params.id).catch((err: Error) => setError(err.message));
    }
  }, [isNew, params.id]);

  function updateVariant(index: number, patch: Partial<VariantDraft>): void {
    setVariants((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function collectPendingImages(): PendingImage[] {
    const pending: PendingImage[] = [];
    const front = angleFiles.front;
    const side = angleFiles.side;
    const back = angleFiles.back;
    if (front) {
      pending.push({ file: front, label: 'Front', isPrimary: true, sortOrder: 0 });
    }
    if (side) {
      pending.push({ file: side, label: 'Side', isPrimary: false, sortOrder: 1 });
    }
    if (back) {
      pending.push({ file: back, label: 'Back', isPrimary: false, sortOrder: 2 });
    }
    extraFiles.forEach((file, index) => {
      pending.push({
        file,
        label: `Extra ${index + 1}`,
        isPrimary: false,
        sortOrder: 3 + index,
      });
    });
    if (!front && pending.length > 0) {
      pending[0] = { ...pending[0]!, isPrimary: true };
    }
    return pending;
  }

  async function uploadPending(productId: string): Promise<void> {
    const pending = collectPendingImages();
    for (const item of pending) {
      await uploadProductImage(productId, item.file, {
        isPrimary: item.isPrimary,
        sortOrder: item.sortOrder,
      });
    }
    setAngleFiles({});
    setAnglePreviews((current) => {
      for (const url of Object.values(current)) {
        if (url) {
          URL.revokeObjectURL(url);
        }
      }
      return {};
    });
    setExtraFiles([]);
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (variants.length < 1) {
      setError('Add at least one variant (size/colour and prices).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const variantPayload = variants.map((variant) => ({
        id: variant.id,
        size: variant.size.trim() || null,
        colour: variant.colour.trim() || null,
        costPrice: variant.costPrice.trim() || '0',
        sellingPrice: variant.sellingPrice.trim() || '0',
        status: variant.status,
      }));

      if (isNew) {
        const created = await apiRequest<ProductDetail>('/products', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            brand: brand.trim() || undefined,
            categoryId: categoryId || null,
            status,
            featured,
            shortDescription: shortDescription.trim() || undefined,
            description: description.trim() || undefined,
            variants: variantPayload.map(({ id: _id, ...rest }) => rest),
          }),
        });
        await uploadPending(created.id);
        router.replace(`/products/${created.id}`);
        return;
      }

      await apiRequest<ProductDetail>(`/products/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          brand: brand.trim() || undefined,
          categoryId: categoryId || null,
          status,
          featured,
          shortDescription: shortDescription.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      for (const variant of variantPayload) {
        if (variant.id) {
          await apiRequest(`/products/${params.id}/variants/${variant.id}`, {
            method: 'PATCH',
            body: JSON.stringify(variant),
          });
        } else {
          await apiRequest(`/products/${params.id}/variants`, {
            method: 'POST',
            body: JSON.stringify(variant),
          });
        }
      }

      await uploadPending(params.id);
      await loadProduct(params.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  }

  async function archiveVariant(variantId: string): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/products/${params.id}/variants/${variantId}`, { method: 'DELETE' });
      await loadProduct(params.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive variant');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function archiveProduct(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/products/${params.id}`, { method: 'DELETE' });
      router.replace('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive product');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function setPrimaryImage(imageId: string): Promise<void> {
    setError('');
    try {
      await apiRequest(`/products/${params.id}/images/${imageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPrimary: true }),
      });
      await loadProduct(params.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set primary image');
    }
  }

  async function removeImage(imageId: string): Promise<void> {
    setError('');
    try {
      await apiRequest(`/products/${params.id}/images/${imageId}`, { method: 'DELETE' });
      await loadProduct(params.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove image');
    }
  }

  const canSave = (isNew && auth.can('products.create')) || (!isNew && auth.can('products.update'));
  const firstVariantId = product?.variants[0]?.id;

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? 'Add product' : product?.name ?? 'Product'}
        description={product ? `${statusLabel(product.status)} · ${product.variants.length} variants` : undefined}
        actions={
          !isNew && firstVariantId ? (
            <Button asChild variant="outline">
              <Link href={`/inventory/${firstVariantId}`}>Set stock</Link>
            </Button>
          ) : null
        }
      />
      <FormError>{error}</FormError>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active categories.{' '}
          <Link className="underline" href="/categories/new">
            Create a category
          </Link>{' '}
          first.
        </p>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" className="mt-1" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select id="category" className={selectClassName} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input id="featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <Label htmlFor="featured">Featured on storefront</Label>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="short">Short description</Label>
              <Input id="short" className="mt-1" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <textarea
                id="desc"
                className="mt-1 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div>
                <p className="text-sm font-medium">Images</p>
                <p className="text-xs text-muted-foreground">
                  Upload Front, Side, and Back (JPEG/PNG/WEBP, max 5MB). Files are stored on the shop API. Front is primary.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['front', 'side', 'back'] as const).map((slot) => {
                  const label = slot === 'front' ? 'Front (primary)' : slot === 'side' ? 'Side' : 'Back';
                  const preview = anglePreviews[slot];
                  return (
                    <div key={slot} className="space-y-2 rounded-md border p-3">
                      <Label htmlFor={`image-${slot}`}>{label}</Label>
                      <Input
                        id={`image-${slot}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="mt-1 cursor-pointer"
                        onChange={(e) => {
                          setAngleFile(slot, e.target.files?.[0]);
                        }}
                      />
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt={`${label} preview`} className="mt-2 h-24 w-full rounded object-cover" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div>
                <Label htmlFor="image-extra">Add another image</Label>
                <Input
                  id="image-extra"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-1 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExtraFiles((current) => [...current, file]);
                    }
                    e.target.value = '';
                  }}
                />
                {extraFiles.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {extraFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExtraFiles((current) => current.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Variants</p>
                  <p className="text-xs text-muted-foreground">SKU is generated automatically from name, size, and colour.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setVariants((rows) => [...rows, emptyVariant()])}>
                  Add variant
                </Button>
              </div>
              {variants.map((variant, index) => (
                <div key={variant.id ?? `new-${index}`} className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`size-${index}`}>Size</Label>
                      <Input
                        id={`size-${index}`}
                        className="mt-1"
                        value={variant.size}
                        onChange={(e) => updateVariant(index, { size: e.target.value })}
                        placeholder="e.g. L"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`colour-${index}`}>Colour</Label>
                      <Input
                        id={`colour-${index}`}
                        className="mt-1"
                        value={variant.colour}
                        onChange={(e) => updateVariant(index, { colour: e.target.value })}
                        placeholder="e.g. Navy"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`cost-${index}`}>Cost</Label>
                      <Input
                        id={`cost-${index}`}
                        className="mt-1"
                        inputMode="decimal"
                        value={variant.costPrice}
                        onChange={(e) => updateVariant(index, { costPrice: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`selling-${index}`}>Selling</Label>
                      <Input
                        id={`selling-${index}`}
                        className="mt-1"
                        inputMode="decimal"
                        value={variant.sellingPrice}
                        onChange={(e) => updateVariant(index, { sellingPrice: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      SKU:{' '}
                      <span className="font-medium text-foreground">
                        {variant.id && variant.sku ? variant.sku : 'Auto-generated on save'}
                      </span>
                    </p>
                    {variant.id && auth.can('products.update') ? (
                      <ConfirmAction
                        triggerLabel="Archive"
                        title="Archive this variant?"
                        description="Historical sales keep the old SKU. Stock for this size will no longer sell."
                        confirmLabel="Archive"
                        disabled={saving}
                        onConfirm={() => archiveVariant(variant.id!)}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setVariants((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canSave ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save product'}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {!isNew && product?.images?.length ? (
        <Card>
          <CardContent className="space-y-3 p-4 text-sm">
            <p className="font-medium">Saved images</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {product.images.map((image) => {
                const src = resolveMediaUrl(image.url);
                return (
                  <div key={image.id} className="space-y-2 rounded-md border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={image.altText ?? product.name} className="h-36 w-full rounded object-cover" />
                    <div className="flex flex-wrap items-center gap-2">
                      {image.isPrimary ? <span className="text-xs font-medium">Primary</span> : null}
                      {auth.can('products.update') && !image.isPrimary ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => void setPrimaryImage(image.id)}>
                          Set primary
                        </Button>
                      ) : null}
                      {auth.can('products.update') ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => void removeImage(image.id)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isNew && auth.can('products.delete') && product?.status !== 'ARCHIVED' ? (
        <ConfirmAction
          triggerLabel="Archive product"
          title="Archive this product?"
          description="Variants are deactivated. Sales history is kept."
          confirmLabel="Archive"
          disabled={saving}
          onConfirm={() => archiveProduct()}
        />
      ) : null}
    </div>
  );
}
