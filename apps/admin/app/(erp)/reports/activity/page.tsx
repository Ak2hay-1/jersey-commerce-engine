'use client';

import { useState } from 'react';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, statusLabel } from '@/lib/format';

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

const ENTITIES = ['', 'Order', 'Payment', 'Sale', 'Refund', 'Product', 'ProductVariant', 'Inventory', 'Customer', 'User', 'Role', 'PromoCode', 'Purchase', 'Expense', 'BackupRun', 'CustomOrder', 'WebsiteSettings'];

function details(row: AuditRow): string | null {
  const parts: Record<string, unknown> = {};
  if (row.oldValue != null) parts.before = row.oldValue;
  if (row.newValue != null) parts.after = row.newValue;
  if (row.metadata != null) parts.metadata = row.metadata;
  return Object.keys(parts).length ? JSON.stringify(parts, null, 2) : null;
}

export default function ActivityLogPage(): React.JSX.Element {
  const [entity, setEntity] = useState('');

  return (
    <ResourceList<AuditRow>
      title="Activity log"
      description="Who changed what, and when — orders, payments, refunds, stock, staff, and settings."
      path="/audit"
      extraQuery={{ entity: entity || undefined }}
      actions={
        <select
          aria-label="Filter by record type"
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
        >
          {ENTITIES.map((value) => (
            <option key={value || 'all'} value={value}>
              {value ? statusLabel(value) : 'All records'}
            </option>
          ))}
        </select>
      }
      empty="No activity recorded yet."
      columns={[
        { key: 'when', header: 'When', render: (row) => formatDateTime(row.createdAt) },
        { key: 'who', header: 'Staff', render: (row) => row.user?.name ?? 'System' },
        { key: 'action', header: 'Action', render: (row) => <code className="text-xs">{row.action}</code> },
        {
          key: 'record',
          header: 'Record',
          hideOnMobile: true,
          render: (row) => (
            <span className="text-xs">
              {row.entity} · <span className="text-muted-foreground">{row.entityId.slice(0, 12)}</span>
            </span>
          ),
        },
        {
          key: 'details',
          header: 'Details',
          hideOnMobile: true,
          render: (row) => {
            const text = details(row);
            return text ? (
              <details className="max-w-md">
                <summary className="cursor-pointer text-xs text-primary">View</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[11px]">{text}</pre>
              </details>
            ) : (
              '—'
            );
          },
        },
      ]}
    />
  );
}
