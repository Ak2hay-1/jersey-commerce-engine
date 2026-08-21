'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { PromoCodeDto, PromoCodeStatus, PromoDiscountType } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInput(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

export default function PromoCodeDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const canManage = auth.can('promoCodes.manage');
  const [promo, setPromo] = useState<PromoCodeDto | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<PromoDiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('10.00');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [status, setStatus] = useState<PromoCodeStatus>('ACTIVE');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isNew) {
      return;
    }
    apiRequest<PromoCodeDto>(`/promo-codes/${params.id}`)
      .then((row) => {
        setPromo(row);
        setCode(row.code);
        setName(row.name);
        setDescription(row.description ?? '');
        setDiscountType(row.discountType);
        setDiscountValue(row.discountValue);
        setMinSubtotal(row.minSubtotal ?? '');
        setMaxDiscount(row.maxDiscount ?? '');
        setUsageLimit(row.usageLimit != null ? String(row.usageLimit) : '');
        setStartsAt(toDateInput(row.startsAt));
        setEndsAt(toDateInput(row.endsAt));
        setStatus(row.status);
      })
      .catch((err: Error) => setError(err.message));
  }, [isNew, params.id]);

  async function onGenerate(): Promise<void> {
    setGenerating(true);
    setError('');
    try {
      const result = await apiRequest<{ code: string }>('/promo-codes/generate', {
        method: 'POST',
        body: JSON.stringify({ prefix: 'JFY' }),
      });
      setCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate a code');
    } finally {
      setGenerating(false);
    }
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        name,
        description: description || null,
        discountType,
        discountValue,
        minSubtotal: minSubtotal || null,
        maxDiscount: maxDiscount || null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        startsAt: fromDateInput(startsAt),
        endsAt: fromDateInput(endsAt),
        ...(isNew ? { code: code || undefined } : { status }),
      };
      if (isNew) {
        const created = await apiRequest<PromoCodeDto>('/promo-codes', { method: 'POST', body: JSON.stringify(body) });
        router.replace(`/promo-codes/${created.id}`);
      } else {
        const updated = await apiRequest<PromoCodeDto>(`/promo-codes/${params.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setPromo(updated);
        setCode(updated.code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save promo code');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? 'Generate promo code' : promo ? promo.code : 'Promo code'}
        description={isNew ? 'Leave the code blank to auto-generate one, or generate a unique JFY- code first.' : promo?.name}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <div className="md:col-span-2">
              <Label htmlFor="code">Code</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="code"
                  className="font-mono uppercase"
                  value={code}
                  disabled={!isNew}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="JFY-XXXXXX"
                />
                {isNew && canManage ? (
                  <Button type="button" variant="outline" onClick={() => void onGenerate()} disabled={generating}>
                    {generating ? 'Generating…' : 'Generate'}
                  </Button>
                ) : null}
              </div>
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-1" value={name} disabled={!canManage} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="type">Discount type</Label>
              <select
                id="type"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={discountType}
                disabled={!canManage}
                onChange={(event) => setDiscountType(event.target.value as PromoDiscountType)}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </div>
            <div>
              <Label htmlFor="value">{discountType === 'PERCENTAGE' ? 'Percent off' : 'Amount off'}</Label>
              <Input id="value" className="mt-1" value={discountValue} disabled={!canManage} onChange={(event) => setDiscountValue(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="min">Minimum subtotal</Label>
              <Input id="min" className="mt-1" value={minSubtotal} disabled={!canManage} onChange={(event) => setMinSubtotal(event.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="max">Maximum discount</Label>
              <Input id="max" className="mt-1" value={maxDiscount} disabled={!canManage} onChange={(event) => setMaxDiscount(event.target.value)} placeholder="Optional cap" />
            </div>
            <div>
              <Label htmlFor="limit">Usage limit</Label>
              <Input id="limit" className="mt-1" value={usageLimit} disabled={!canManage} onChange={(event) => setUsageLimit(event.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <Label htmlFor="starts">Starts</Label>
              <Input id="starts" type="date" className="mt-1" value={startsAt} disabled={!canManage} onChange={(event) => setStartsAt(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="ends">Ends</Label>
              <Input id="ends" type="date" className="mt-1" value={endsAt} disabled={!canManage} onChange={(event) => setEndsAt(event.target.value)} />
            </div>
            {!isNew ? (
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={status}
                  disabled={!canManage}
                  onChange={(event) => setStatus(event.target.value as PromoCodeStatus)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <textarea
                id="desc"
                className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={description}
                disabled={!canManage}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {canManage ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Create promo code' : 'Save changes'}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
      {!isNew && promo ? (
        <p className="text-sm text-muted-foreground">
          Used {promo.usageCount}
          {promo.usageLimit != null ? ` of ${promo.usageLimit}` : ''} times.
        </p>
      ) : null}
    </div>
  );
}
