import type { PaginationMeta } from './api';
import type { ExpenseStatus, PaymentMethod } from './enums';

export type MoneyString = string;

export interface ExpenseCategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface ExpenseDto {
  id: string;
  categoryId: string;
  category: ExpenseCategoryDto;
  amount: MoneyString;
  description: string | null;
  paymentMethod: PaymentMethod;
  reference: string | null;
  expenseDate: string;
  status: ExpenseStatus;
  createdBy: { id: string; name: string };
  voidedAt: string | null;
  voidedBy: { id: string; name: string } | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResult {
  items: ExpenseDto[];
  meta: PaginationMeta;
}

export interface CreateExpenseInput {
  categoryId: string;
  amount: string;
  description?: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  expenseDate: string;
}

export interface UpdateExpenseInput {
  categoryId?: string;
  amount?: string;
  description?: string | null;
  paymentMethod?: PaymentMethod;
  reference?: string | null;
  expenseDate?: string;
}

export interface VoidExpenseInput {
  reason: string;
}
