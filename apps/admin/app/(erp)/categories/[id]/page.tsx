'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { CategoryDetail } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

export default function CategoryDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [parents, setParents] = useState<CategoryDetail[]>([]);
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [parentId, setParentId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiRequest<{ items: CategoryDetail[] } | CategoryDetail[]>(
      `/categories${queryString({ page: 1, pageSize: 100 })}`,
    ).then((result) => {
      const items = Array.isArray(result) ? result : (result.items ?? []);
      setParents(items.filter((item) => item.id !== params.id));
    });
    if (!isNew) {
      apiRequest<CategoryDetail>(`/categories/${params.id}`)
        .then((row) => {
          setCategory(row);
          setName(row.name);
          setSlug(row.slug);
          setDescription(row.description ?? '');
          setImage(row.image ?? '');
          setParentId(row.parentId ?? '');
          setStatus(row.status);
        })
        .catch((err: Error) => setError(err.message));
    }
  }, [isNew, params.id]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        image: image.trim() || undefined,
        parentId: parentId || null,
        status,
      };
      if (isNew) {
        const created = await apiRequest<CategoryDetail>('/categories', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        router.replace(`/categories/${created.id}`);
      } else {
        const updated = await apiRequest<CategoryDetail>(`/categories/${params.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setCategory(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save category');
    } finally {
      setSaving(false);
    }
  }

  async function onArchive(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      try {
        await apiRequest(`/categories/${params.id}`, { method: 'DELETE' });
        router.replace('/categories');
      } catch {
        await apiRequest(`/categories/${params.id}/archive`, { method: 'POST' });
        const updated = await apiRequest<CategoryDetail>(`/categories/${params.id}`);
        setCategory(updated);
        setStatus(updated.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive category');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const canSave = (isNew && auth.can('categories.create')) || (!isNew && auth.can('categories.update'));

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? 'Add category' : category?.name ?? 'Category'}
        description={category ? statusLabel(category.status) : 'Create a catalog category before adding products.'}
        actions={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href="/products/new">Add product</Link>
            </Button>
          ) : null
        }
      />
      <FormError>{error}</FormError>
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="slug">Slug (optional)</Label>
              <Input id="slug" className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-from-name" />
            </div>
            <div>
              <Label htmlFor="parent">Parent</Label>
              <select id="parent" className={selectClassName} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None (top level)</option>
                {parents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
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
            <div className="md:col-span-2">
              <Label htmlFor="image">Image URL</Label>
              <Input id="image" className="mt-1" value={image} onChange={(e) => setImage(e.target.value)} />
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
            {canSave ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
      {!isNew && auth.can('categories.delete') && category?.status !== 'ARCHIVED' ? (
        <ConfirmAction
          triggerLabel="Archive / delete"
          title="Remove this category?"
          description="Empty categories are deleted. Categories with products are archived."
          confirmLabel="Confirm"
          disabled={saving}
          onConfirm={() => onArchive()}
        />
      ) : null}
    </div>
  );
}
