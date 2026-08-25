'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { CategoryDetail, ProductDetail, ProductVariantDto } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface VariantDraft {
  id?: string;
  size: string;
  colour: string;
  sku: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  status: string;
}

function emptyVariant(): VariantDraft {
  return { size: '', colour: '', sku: '', barcode: '', costPrice: '0', sellingPrice: '0', status: 'ACTIVE' };
}

function fromApi(variant: ProductVariantDto): VariantDraft {
  return {
    id: variant.id,
    size: variant.size ?? '',
    colour: variant.colour ?? '',
    sku: variant.sku,
    barcode: variant.barcode ?? '',
    costPrice: variant.costPrice,
    sellingPrice: variant.sellingPrice,
    status: variant.status,
  };
}

export default function ProductDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [categories, setCategories] = useState<CategoryDetail[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [featured, setFeatured] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadProduct(id: string): Promise<void> {
    const row = await apiRequest<ProductDetail>(`/products/${id}`);
    setProduct(row);
    setName(row.name);
    setSlug(row.slug);
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
        sku: variant.sku.trim() || undefined,
        barcode: variant.barcode.trim() || undefined,
        costPrice: variant.costPrice || '0',
        sellingPrice: variant.sellingPrice || '0',
        status: variant.status,
      }));

      if (isNew) {
        const created = await apiRequest<ProductDetail>('/products', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim() || undefined,
            brand: brand.trim() || undefined,
            categoryId: categoryId || null,
            status,
            featured,
            shortDescription: shortDescription.trim() || undefined,
            description: description.trim() || undefined,
            variants: variantPayload.map(({ id: _id, ...rest }) => rest),
          }),
        });
        if (imageUrl.trim()) {
          await apiRequest(`/products/${created.id}/images`, {
            method: 'POST',
            body: JSON.stringify({ url: imageUrl.trim(), isPrimary: true }),
          });
        }
        router.replace(`/products/${created.id}`);
        return;
      }

      await apiRequest<ProductDetail>(`/products/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
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

      if (imageUrl.trim()) {
        await apiRequest(`/products/${params.id}/images`, {
          method: 'POST',
          body: JSON.stringify({ url: imageUrl.trim(), isPrimary: true }),
        });
        setImageUrl('');
      }

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
      {!isNew && categories.length === 0 ? (
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
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} />
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
            <div className="md:col-span-2">
              <Label htmlFor="image">Add image URL</Label>
              <Input id="image" className="mt-1" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Variants</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setVariants((rows) => [...rows, emptyVariant()])}>
                  Add variant
                </Button>
              </div>
              {variants.map((variant, index) => (
                <div key={variant.id ?? `new-${index}`} className="grid gap-2 rounded-md border p-3 md:grid-cols-6">
                  <Input placeholder="Size" value={variant.size} onChange={(e) => updateVariant(index, { size: e.target.value })} />
                  <Input placeholder="Colour" value={variant.colour} onChange={(e) => updateVariant(index, { colour: e.target.value })} />
                  <Input placeholder="SKU" value={variant.sku} onChange={(e) => updateVariant(index, { sku: e.target.value })} />
                  <Input placeholder="Cost" value={variant.costPrice} onChange={(e) => updateVariant(index, { costPrice: e.target.value })} />
                  <Input placeholder="Selling" value={variant.sellingPrice} onChange={(e) => updateVariant(index, { sellingPrice: e.target.value })} required />
                  <div className="flex gap-2">
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
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-medium">Images</p>
            {product.images.map((image) => (
              <div key={image.id} className="flex items-center justify-between gap-2">
                <a className="truncate underline" href={image.url} target="_blank" rel="noreferrer">
                  {image.url}
                </a>
                {auth.can('products.update') ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void apiRequest(`/products/${params.id}/images/${image.id}`, { method: 'DELETE' })
                        .then(() => loadProduct(params.id))
                        .catch((err: Error) => setError(err.message))
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
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
