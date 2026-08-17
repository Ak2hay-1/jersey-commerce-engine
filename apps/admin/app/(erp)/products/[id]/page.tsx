'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

interface ProductDetail {
  id: string;
  name: string;
  status: string;
  category?: { name: string } | null;
  variants: Array<{ id: string; sku: string; size: string | null; color: string | null; sellingPrice: string; costPrice: string }>;
}

export default function ProductDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<ProductDetail>(`/products/${params.id}`).then(setProduct).catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!product) return <p className="text-sm text-muted-foreground">Loading product…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title={product.name} description={`${product.category?.name ?? 'Uncategorised'} · ${product.status}`} />
      <DataTable
        caption="Variants"
        rows={product.variants}
        rowHref={(row) => `/inventory/${row.id}`}
        columns={[
          { key: 'sku', header: 'SKU', render: (row) => row.sku },
          { key: 'size', header: 'Size', render: (row) => row.size ?? '—' },
          { key: 'color', header: 'Colour', render: (row) => row.color ?? '—' },
          { key: 'sell', header: 'Selling', render: (row) => formatMoney(row.sellingPrice) },
          { key: 'cost', header: 'Cost', hideOnMobile: true, render: (row) => formatMoney(row.costPrice) },
        ]}
      />
    </div>
  );
}
