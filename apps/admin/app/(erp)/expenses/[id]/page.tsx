'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { ExpenseCategoryDto, ExpenseDto } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';
import { useRouteParam } from '@/lib/use-route-param';

export default function ExpenseDetailPage(): React.JSX.Element {
  const id = useRouteParam('id');
  const isNew = id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [expense, setExpense] = useState<ExpenseDto | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [voidReason, setVoidReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiRequest<ExpenseCategoryDto[]>('/expenses/categories').then(setCategories);
    if (!isNew) {
      apiRequest<ExpenseDto>(`/expenses/${id}`)
        .then((row) => {
          setExpense(row);
          setCategoryId(row.categoryId);
          setAmount(row.amount);
          setDescription(row.description ?? '');
          setPaymentMethod(row.paymentMethod);
          setReference(row.reference ?? '');
          setExpenseDate(row.expenseDate);
        })
        .catch((err: Error) => setError(err.message));
    }
  }, [isNew, id]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { categoryId, amount, description, paymentMethod, reference, expenseDate };
      if (isNew) {
        const created = await apiRequest<ExpenseDto>('/expenses', { method: 'POST', body: JSON.stringify(body) });
        router.replace(`/expenses/${created.id}`);
      } else {
        const updated = await apiRequest<ExpenseDto>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setExpense(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setSaving(false);
    }
  }

  async function onVoid(): Promise<void> {
    if (!voidReason.trim()) {
      setError('A void reason is required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiRequest<ExpenseDto>(`/expenses/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: voidReason }),
      });
      setExpense(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to void expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={isNew ? 'Record expense' : expense ? `Expense ${formatMoney(expense.amount)}` : 'Expense'} description={expense ? statusLabel(expense.status) : undefined} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="category">Category</Label>
              <select id="category" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Select</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" className="mt-1" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="method">Payment method</Label>
              <select id="method" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="ref">Reference</Label>
              <Input id="ref" className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            {(isNew && auth.can('expenses.create')) || (!isNew && auth.can('expenses.update') && expense?.status !== 'VOIDED') ? (
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
      {!isNew && expense?.status === 'ACTIVE' && auth.can('expenses.delete') ? (
        <div className="flex max-w-xl items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="void">Void reason</Label>
            <Input id="void" className="mt-1" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          </div>
          <Button type="button" variant="destructive" onClick={() => void onVoid()} disabled={saving}>
            Void
          </Button>
        </div>
      ) : null}
    </div>
  );
}
