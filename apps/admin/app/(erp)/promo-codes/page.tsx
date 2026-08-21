'use client';

import Link from 'next/link';
import { Badge, Button } from '@jersey-commerce/ui';
import type { PromoCodeDto } from '@jersey-commerce/types';
import { ResourceList } from '@/components/resource-list';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

export default function PromoCodesPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<PromoCodeDto>
      title="Promo codes"
      description="Generate storefront discount codes. Shoppers apply them at cart and checkout."
      path="/promo-codes"
      rowHref={(row) => `/promo-codes/${row.id}`}
      actions={
        auth.can('promoCodes.manage') ? (
          <Button asChild>
            <Link href="/promo-codes/new">Generate promo code</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'code', header: 'Code', render: (row) => <span className="font-mono">{row.code}</span> },
        { key: 'name', header: 'Name', render: (row) => row.name },
        {
          key: 'discount',
          header: 'Discount',
          render: (row) => (row.discountType === 'PERCENTAGE' ? `${row.discountValue}%` : formatMoney(row.discountValue)),
        },
        { key: 'uses', header: 'Uses', hideOnMobile: true, render: (row) => `${row.usageCount}${row.usageLimit != null ? ` / ${row.usageLimit}` : ''}` },
        { key: 'ends', header: 'Ends', hideOnMobile: true, render: (row) => formatDate(row.endsAt) },
        { key: 'st', header: 'Status', render: (row) => <Badge variant={row.status === 'ACTIVE' ? 'secondary' : 'outline'}>{statusLabel(row.status)}</Badge> },
      ]}
    />
  );
}
