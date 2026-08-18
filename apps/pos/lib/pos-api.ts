import type {
  AddPosCartItemInput,
  CancelPosSaleInput,
  ClosePosSessionInput,
  CompletePosSaleInput,
  CreatePosCartInput,
  CustomerSummary,
  OpenPosSessionInput,
  PosCartDto,
  PosCartListResult,
  PosLookupItem,
  PosLookupResult,
  PosReceiptFormat,
  PosReceiptResponse,
  PosSaleDto,
  PosSaleListResult,
  PosSaleQuery,
  PosSessionDto,
  PosSessionListResult,
  RefundPosSaleInput,
  UpdatePosCartInput,
  UpdatePosCartItemInput,
} from '@jersey-commerce/types';
import { apiRequest, isNotFound, queryString } from './api';

export async function getCurrentSession(): Promise<PosSessionDto | null> {
  try {
    return await apiRequest<PosSessionDto>('/pos/sessions/current');
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export function openSession(input: OpenPosSessionInput): Promise<PosSessionDto> {
  return apiRequest('/pos/sessions/open', { method: 'POST', body: JSON.stringify(input) });
}

export function closeSession(id: string, input: ClosePosSessionInput): Promise<PosSessionDto> {
  return apiRequest(`/pos/sessions/${id}/close`, { method: 'POST', body: JSON.stringify(input) });
}

export function listSessions(page = 1, pageSize = 20): Promise<PosSessionListResult> {
  return apiRequest(`/pos/sessions${queryString({ page, pageSize })}`);
}

export async function getCart(): Promise<PosCartDto | null> {
  try {
    return await apiRequest<PosCartDto>('/pos/cart');
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export function createCart(input: CreatePosCartInput = {}): Promise<PosCartDto> {
  return apiRequest('/pos/cart', { method: 'POST', body: JSON.stringify(input) });
}

export async function ensureCart(): Promise<PosCartDto> {
  const existing = await getCart();
  return existing ?? createCart({});
}

export function updateCart(input: UpdatePosCartInput): Promise<PosCartDto> {
  return apiRequest('/pos/cart', { method: 'PATCH', body: JSON.stringify(input) });
}

export function clearCart(): Promise<PosCartDto> {
  return apiRequest('/pos/cart', { method: 'DELETE' });
}

export function addCartItem(input: AddPosCartItemInput): Promise<PosCartDto> {
  return apiRequest('/pos/cart/items', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCartItem(id: string, input: UpdatePosCartItemInput): Promise<PosCartDto> {
  return apiRequest(`/pos/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function removeCartItem(id: string): Promise<PosCartDto> {
  return apiRequest(`/pos/cart/items/${id}`, { method: 'DELETE' });
}

export function listHeldCarts(): Promise<PosCartListResult> {
  return apiRequest('/pos/carts/held');
}

export function holdCart(id: string): Promise<PosCartDto> {
  return apiRequest(`/pos/carts/${id}/hold`, { method: 'POST' });
}

export function resumeCart(id: string): Promise<PosCartDto> {
  return apiRequest(`/pos/carts/${id}/resume`, { method: 'POST' });
}

export function lookupProducts(params: { q?: string; barcode?: string; sku?: string; limit?: number }): Promise<PosLookupResult> {
  return apiRequest(`/pos/products${queryString(params)}`);
}

export async function lookupBarcode(barcode: string): Promise<PosLookupItem | null> {
  try {
    return await apiRequest<PosLookupItem>(`/pos/products/barcode/${encodeURIComponent(barcode)}`);
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export function searchCustomers(search: string): Promise<{ items: CustomerSummary[] }> {
  return apiRequest(`/pos/customers${queryString({ search, pageSize: 10 })}`);
}

export function completeSale(input: CompletePosSaleInput): Promise<PosSaleDto> {
  return apiRequest('/pos/sales/complete', { method: 'POST', body: JSON.stringify(input) });
}

export function listSales(query: PosSaleQuery = {}): Promise<PosSaleListResult> {
  return apiRequest(`/pos/sales${queryString(query)}`);
}

export function getSale(id: string): Promise<PosSaleDto> {
  return apiRequest(`/pos/sales/${id}`);
}

export function getSaleReceipt(id: string, format: PosReceiptFormat = 'thermal'): Promise<PosReceiptResponse> {
  return apiRequest(`/pos/sales/${id}/receipt${queryString({ format })}`);
}

export function refundSale(id: string, input: RefundPosSaleInput): Promise<PosSaleDto> {
  return apiRequest(`/pos/sales/${id}/refund`, { method: 'POST', body: JSON.stringify(input) });
}

export function cancelSale(id: string, input: CancelPosSaleInput): Promise<PosSaleDto> {
  return apiRequest(`/pos/sales/${id}/cancel`, { method: 'POST', body: JSON.stringify(input) });
}
