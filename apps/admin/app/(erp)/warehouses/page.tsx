'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { WarehouseDto } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { FormError } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';
import { DataTable } from '@/components/data-table';

const emptyForm = {
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'IN',
  delhiveryPickupLocation: '',
  isActive: true,
  sortOrder: '0',
};

export default function WarehousesPage(): React.JSX.Element {
  const auth = useAuth();
  const canManage = auth.can('inventory.manage');
  const [items, setItems] = useState<WarehouseDto[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const result = await apiRequest<{ items: WarehouseDto[] }>('/warehouses');
      setItems(result.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load warehouses');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(row: WarehouseDto): void {
    setEditingId(row.id);
    setForm({
      name: row.name,
      phone: row.phone ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      postalCode: row.postalCode ?? '',
      country: row.country || 'IN',
      delhiveryPickupLocation: row.delhiveryPickupLocation ?? '',
      isActive: row.isActive,
      sortOrder: String(row.sortOrder),
    });
  }

  function resetForm(): void {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!canManage) {
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || 'IN',
      delhiveryPickupLocation: form.delhiveryPickupLocation.trim() || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editingId) {
        await apiRequest(`/warehouses/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiRequest('/warehouses', { method: 'POST', body: JSON.stringify(body) });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save warehouse');
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(id: string): Promise<void> {
    if (!canManage) {
      return;
    }
    try {
      await apiRequest(`/warehouses/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deactivate warehouse');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Warehouses"
        description="Pickup origins for Delhivery. Assign a warehouse on each product. Stock remains a single pool per variant."
      />
      <FormError>{error}</FormError>

      {canManage ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">{editingId ? 'Edit warehouse' : 'Add warehouse'}</p>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
              <div>
                <Label htmlFor="wh-name">Name</Label>
                <Input
                  id="wh-name"
                  className="mt-1"
                  required
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-pickup">Delhivery pickup location</Label>
                <Input
                  id="wh-pickup"
                  className="mt-1"
                  placeholder="Registered Delhivery name"
                  value={form.delhiveryPickupLocation}
                  onChange={(e) => setForm((c) => ({ ...c, delhiveryPickupLocation: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-phone">Phone</Label>
                <Input
                  id="wh-phone"
                  className="mt-1"
                  value={form.phone}
                  onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-city">City</Label>
                <Input
                  id="wh-city"
                  className="mt-1"
                  value={form.city}
                  onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="wh-address">Address</Label>
                <Input
                  id="wh-address"
                  className="mt-1"
                  value={form.address}
                  onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-state">State</Label>
                <Input
                  id="wh-state"
                  className="mt-1"
                  value={form.state}
                  onChange={(e) => setForm((c) => ({ ...c, state: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-pin">Postal code</Label>
                <Input
                  id="wh-pin"
                  className="mt-1"
                  value={form.postalCode}
                  onChange={(e) => setForm((c) => ({ ...c, postalCode: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="wh-sort">Sort order</Label>
                <Input
                  id="wh-sort"
                  className="mt-1"
                  value={form.sortOrder}
                  onChange={(e) => setForm((c) => ({ ...c, sortOrder: e.target.value }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input
                  id="wh-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
                />
                <Label htmlFor="wh-active">Active</Label>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Add warehouse'}
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        caption="Warehouses"
        columns={[
          { key: 'name', header: 'Name', render: (row) => row.name },
          { key: 'city', header: 'City', render: (row) => row.city ?? '—' },
          {
            key: 'pickup',
            header: 'Delhivery pickup',
            hideOnMobile: true,
            render: (row) => row.delhiveryPickupLocation ?? '—',
          },
          { key: 'st', header: 'Status', render: (row) => (row.isActive ? 'Active' : 'Inactive') },
          {
            key: 'actions',
            header: '',
            render: (row) =>
              canManage ? (
                <div className="flex gap-2">
                  <button type="button" className="text-xs underline" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                  {row.isActive ? (
                    <button type="button" className="text-xs underline" onClick={() => void onDeactivate(row.id)}>
                      Deactivate
                    </button>
                  ) : null}
                </div>
              ) : (
                '—'
              ),
          },
        ]}
        rows={items}
      />
      {!canManage ? <p className="text-xs text-muted-foreground">You need inventory.manage to add warehouses.</p> : null}
      <p className="text-xs text-muted-foreground">
        Tip: create up to 5 locations, then set Warehouse / pickup on each product in Products.
      </p>
    </div>
  );
}
