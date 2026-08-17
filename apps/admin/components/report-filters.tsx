'use client';

import type { ReactNode } from 'react';
import { Button, Input, Label } from '@jersey-commerce/ui';
import { DATE_RANGE_PRESETS, type DateRangePreset, type PermissionCode } from '@jersey-commerce/types';
import { useAuth } from '@/lib/auth';

export interface ReportFilterValue {
  preset: DateRangePreset;
  from?: string;
  to?: string;
  search?: string;
  source?: string;
  paymentMethod?: string;
  status?: string;
  categoryId?: string;
  segment?: string;
}

interface ReportFiltersProps {
  value: ReportFilterValue;
  onChange: (next: ReportFilterValue) => void;
  onExport?: () => void;
  canExport?: boolean;
  showSource?: boolean;
  showPayment?: boolean;
  showStatus?: boolean;
  showSearch?: boolean;
  extra?: ReactNode;
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  this_month: 'This month',
  last_month: 'Last month',
  custom: 'Custom range',
};

export function ReportFilters({
  value,
  onChange,
  onExport,
  canExport,
  showSource,
  showPayment,
  showStatus,
  showSearch,
  extra,
}: ReportFiltersProps): React.JSX.Element {
  const auth = useAuth();
  const exportAllowed = canExport && auth.can('reports.export' as PermissionCode);

  return (
    <form
      className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-4 lg:grid-cols-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <div>
        <Label htmlFor="preset">Date range</Label>
        <select
          id="preset"
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={value.preset}
          onChange={(event) => onChange({ ...value, preset: event.target.value as DateRangePreset })}
        >
          {DATE_RANGE_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {PRESET_LABELS[preset]}
            </option>
          ))}
        </select>
      </div>
      {value.preset === 'custom' ? (
        <>
          <div>
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              className="mt-1"
              value={value.from ?? ''}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              className="mt-1"
              value={value.to ?? ''}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
            />
          </div>
        </>
      ) : null}
      {showSearch ? (
        <div>
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            className="mt-1"
            value={value.search ?? ''}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
          />
        </div>
      ) : null}
      {showSource ? (
        <div>
          <Label htmlFor="source">Channel</Label>
          <select
            id="source"
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={value.source ?? ''}
            onChange={(event) => onChange({ ...value, source: event.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="POS">POS</option>
            <option value="WEBSITE">Website</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
      ) : null}
      {showPayment ? (
        <div>
          <Label htmlFor="payment">Payment</Label>
          <select
            id="payment"
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={value.paymentMethod ?? ''}
            onChange={(event) => onChange({ ...value, paymentMethod: event.target.value || undefined })}
          >
            <option value="">All</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      ) : null}
      {showStatus ? (
        <div>
          <Label htmlFor="status">Status</Label>
          <Input
            id="status"
            className="mt-1"
            value={value.status ?? ''}
            onChange={(event) => onChange({ ...value, status: event.target.value || undefined })}
          />
        </div>
      ) : null}
      {extra}
      {exportAllowed && onExport ? (
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={onExport}>
            Export CSV
          </Button>
        </div>
      ) : null}
    </form>
  );
}
