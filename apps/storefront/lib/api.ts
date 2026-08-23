import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  CartDto,
  CategoryDetail,
  CheckoutQuote,
  CheckoutResult,
  FulfillmentMethod,
  OrderDetail,
  OrderSummary,
  PaginationMeta,
  StorefrontAuthResponse,
  StorefrontBootstrap,
  StorefrontCustomer,
  StorefrontProductDetail,
  StorefrontProductListItem,
  StorefrontProductListResult,
  StorefrontResolvedTenant,
  StorefrontSearchResult,
  CustomOrderPublicConfig,
  PublicCustomOrder,
} from '@jersey-commerce/types';
import { publicEnv } from './env';
import { StoreApiError } from './errors';
import { STORE_COOKIES, readBrowserCookie } from './cookies';
import { defaultTenantSlug } from './tenant';

export type StoreRequestOptions = {
  tenantSlug?: string;
  cartToken?: string;
  accessToken?: string;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
  signal?: AbortSignal;
};

type ListQuery = {
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  featured?: boolean;
  brand?: string;
  size?: string;
  colour?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

function apiBase(): string {
  // Browser: same-origin proxy (next.config rewrites) avoids CORS and mixed-content fetch failures.
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  const raw = process.env.API_INTERNAL_URL || publicEnv.NEXT_PUBLIC_API_URL;
  return `${raw.replace(/\/$/, '')}/api/v1`;
}

function unwrap<T>(payload: ApiSuccessResponse<T> | ApiErrorResponse, status: number): T {
  if (!payload || typeof payload !== 'object') {
    throw new StoreApiError('The store is temporarily unavailable.', status);
  }
  if ('success' in payload && payload.success === false) {
    throw new StoreApiError(payload.error.message, status, payload.error.code);
  }
  if ('success' in payload && payload.success === true) {
    return payload.data;
  }
  return payload as T;
}

async function storeFetch<T>(
  path: string,
  init: RequestInit & StoreRequestOptions & { parse?: boolean } = {},
): Promise<T> {
  const tenantSlug = init.tenantSlug || readBrowserCookie(STORE_COOKIES.tenant) || defaultTenantSlug();
  const cartToken = init.cartToken ?? readBrowserCookie(STORE_COOKIES.cart);
  const accessToken = init.accessToken ?? readBrowserCookie(STORE_COOKIES.customer);
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type') && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  if (tenantSlug) {
    headers.set('x-tenant-slug', tenantSlug);
  }
  if (cartToken) {
    headers.set('x-cart-token', cartToken);
  }
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  const url = `${apiBase()}${path}`;
  const { tenantSlug: _tenantSlug, cartToken: _cartToken, accessToken: _accessToken, parse: _parse, ...requestInit } =
    init;
  const response = await fetch(url, {
    ...requestInit,
    headers,
    cache: init.cache,
    next: init.next,
    signal: init.signal,
  });
  const raw = await response.text();
  let payload: ApiSuccessResponse<T> | ApiErrorResponse | undefined;
  if (raw) {
    try {
      payload = JSON.parse(raw) as ApiSuccessResponse<T> | ApiErrorResponse;
    } catch {
      throw new StoreApiError('The store is temporarily unavailable.', response.status || 502);
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload ? payload.error.message : 'Request failed.';
    throw new StoreApiError(message, response.status, payload && 'error' in payload ? payload.error.code : undefined);
  }
  if (!payload) {
    throw new StoreApiError('The store is temporarily unavailable.', response.status || 502);
  }
  return unwrap(payload, response.status);
}

function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') {
      continue;
    }
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export const storeApi = {
  resolve(input: { slug?: string; host?: string }, options?: StoreRequestOptions) {
    return storeFetch<StorefrontResolvedTenant>(`/store/resolve${queryString(input)}`, {
      ...options,
      cache: 'no-store',
    });
  },

  bootstrap(options?: StoreRequestOptions) {
    return storeFetch<StorefrontBootstrap>('/store/bootstrap', {
      ...options,
      next: options?.next ?? { revalidate: 60, tags: ['store-bootstrap'] },
    });
  },

  products(query: ListQuery = {}, options?: StoreRequestOptions) {
    return storeFetch<StorefrontProductListResult>(`/store/products${queryString(query)}`, {
      ...options,
      next: options?.next ?? { revalidate: 30, tags: ['store-products'] },
    });
  },

  product(slug: string, options?: StoreRequestOptions) {
    return storeFetch<StorefrontProductDetail>(`/store/products/${encodeURIComponent(slug)}`, {
      ...options,
      next: options?.next ?? { revalidate: 30, tags: ['store-products'] },
    });
  },

  categories(options?: StoreRequestOptions) {
    return storeFetch<CategoryDetail[]>('/store/categories', {
      ...options,
      next: options?.next ?? { revalidate: 60, tags: ['store-categories'] },
    });
  },

  category(slug: string, slugPath?: string, options?: StoreRequestOptions) {
    return storeFetch<CategoryDetail>(
      `/store/categories/${encodeURIComponent(slug)}${queryString({ slugPath })}`,
      { ...options, next: options?.next ?? { revalidate: 60, tags: ['store-categories'] } },
    );
  },

  search(query: ListQuery, options?: StoreRequestOptions) {
    return storeFetch<StorefrontSearchResult>(`/store/search${queryString(query)}`, {
      ...options,
      next: options?.next ?? { revalidate: 30, tags: ['store-products'] },
    });
  },

  featured(options?: StoreRequestOptions) {
    return storeFetch<StorefrontProductListItem[]>('/store/collections/featured', {
      ...options,
      next: options?.next ?? { revalidate: 60 },
    });
  },

  newest(options?: StoreRequestOptions) {
    return storeFetch<StorefrontProductListItem[]>('/store/collections/new', {
      ...options,
      next: options?.next ?? { revalidate: 60 },
    });
  },

  bestSellers(options?: StoreRequestOptions) {
    return storeFetch<StorefrontProductListItem[]>('/store/collections/best-sellers', {
      ...options,
      next: options?.next ?? { revalidate: 60, tags: ['store-products'] },
    });
  },

  createCart(options?: StoreRequestOptions) {
    return storeFetch<CartDto>('/store/cart', { ...options, method: 'POST', cache: 'no-store' });
  },

  getCart(options?: StoreRequestOptions) {
    return storeFetch<CartDto>('/store/cart', { ...options, cache: 'no-store' });
  },

  addCartItem(input: { productVariantId: string; quantity?: number }, options?: StoreRequestOptions) {
    return storeFetch<CartDto>('/store/cart/items', {
      ...options,
      method: 'POST',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  updateCartItem(id: string, quantity: number, options?: StoreRequestOptions) {
    return storeFetch<CartDto>(`/store/cart/items/${encodeURIComponent(id)}`, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
      cache: 'no-store',
    });
  },

  removeCartItem(id: string, options?: StoreRequestOptions) {
    return storeFetch<CartDto>(`/store/cart/items/${encodeURIComponent(id)}`, {
      ...options,
      method: 'DELETE',
      cache: 'no-store',
    });
  },

  applyPromo(code: string, options?: StoreRequestOptions) {
    return storeFetch<CartDto>('/store/cart/promo', {
      ...options,
      method: 'POST',
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });
  },

  removePromo(options?: StoreRequestOptions) {
    return storeFetch<CartDto>('/store/cart/promo', {
      ...options,
      method: 'DELETE',
      cache: 'no-store',
    });
  },

  quoteCheckout(fulfillmentMethod: FulfillmentMethod, options?: StoreRequestOptions) {
    return storeFetch<CheckoutQuote>('/store/checkout/quote', {
      ...options,
      method: 'POST',
      body: JSON.stringify({ fulfillmentMethod }),
      cache: 'no-store',
    });
  },

  checkout(
    input: {
      fulfillmentMethod?: FulfillmentMethod;
      customer?: { name: string; phone?: string; email?: string };
      shippingAddress?: {
        fullName: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        postalCode: string;
        country?: string;
      };
      notes?: string;
    },
    options?: StoreRequestOptions & { idempotencyKey?: string },
  ) {
    const headers = new Headers();
    if (options?.idempotencyKey) {
      headers.set('idempotency-key', options.idempotencyKey);
    }
    return storeFetch<CheckoutResult>('/store/checkout', {
      ...options,
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  register(input: { name: string; email: string; password: string; phone?: string }, options?: StoreRequestOptions) {
    return storeFetch<StorefrontAuthResponse>('/store/auth/register', {
      ...options,
      method: 'POST',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  login(input: { email?: string; phone?: string; password: string }, options?: StoreRequestOptions) {
    return storeFetch<StorefrontAuthResponse>('/store/auth/login', {
      ...options,
      method: 'POST',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  requestOtp(
    input: { channel: 'email' | 'sms'; email?: string; phone?: string },
    options?: StoreRequestOptions,
  ) {
    return storeFetch<{ sent: true; expiresIn: number; debugCode?: string }>('/store/auth/otp/request', {
      ...options,
      method: 'POST',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  verifyOtp(
    input: { channel: 'email' | 'sms'; email?: string; phone?: string; code: string; name?: string },
    options?: StoreRequestOptions,
  ) {
    return storeFetch<StorefrontAuthResponse>('/store/auth/otp/verify', {
      ...options,
      method: 'POST',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  startGoogle(input?: { origin?: string }, options?: StoreRequestOptions) {
    const suffix = input?.origin ? `?origin=${encodeURIComponent(input.origin)}` : '';
    return storeFetch<{ authorizationUrl: string }>(`/store/auth/google/start${suffix}`, {
      ...options,
      cache: 'no-store',
    });
  },

  exchangeGoogle(ticket: string, options?: StoreRequestOptions) {
    return storeFetch<StorefrontAuthResponse>('/store/auth/google/exchange', {
      ...options,
      method: 'POST',
      body: JSON.stringify({ ticket }),
      cache: 'no-store',
    });
  },

  logout(options?: StoreRequestOptions) {
    return storeFetch<{ loggedOut: boolean }>('/store/auth/logout', {
      ...options,
      method: 'POST',
      cache: 'no-store',
    });
  },

  me(options?: StoreRequestOptions) {
    return storeFetch<StorefrontCustomer>('/store/account/me', { ...options, cache: 'no-store' });
  },

  updateProfile(
    input: Partial<Pick<StorefrontCustomer, 'name' | 'email' | 'phone' | 'address' | 'city' | 'state' | 'postalCode'>>,
    options?: StoreRequestOptions,
  ) {
    return storeFetch<StorefrontCustomer>('/store/account/profile', {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(input),
      cache: 'no-store',
    });
  },

  orders(options?: StoreRequestOptions) {
    return storeFetch<{ items: OrderSummary[]; meta: PaginationMeta }>('/store/orders', {
      ...options,
      cache: 'no-store',
    });
  },

  order(id: string, options?: StoreRequestOptions) {
    return storeFetch<OrderDetail>(`/store/orders/${encodeURIComponent(id)}`, { ...options, cache: 'no-store' });
  },

  customOrderConfig(options?: StoreRequestOptions) {
    return storeFetch<CustomOrderPublicConfig>('/store/custom-orders/config', {
      ...options,
      next: options?.next ?? { revalidate: 60, tags: ['store-custom-orders'] },
    });
  },

  submitCustomOrderInquiry(input: FormData | Record<string, string>, options?: StoreRequestOptions) {
    const body = input instanceof FormData ? input : JSON.stringify(input);
    return storeFetch<PublicCustomOrder>('/store/custom-orders/inquiry', {
      ...options,
      method: 'POST',
      body,
      cache: 'no-store',
    });
  },

  getCustomOrder(publicId: string, options?: StoreRequestOptions) {
    return storeFetch<PublicCustomOrder>(`/store/custom-orders/${encodeURIComponent(publicId)}`, {
      ...options,
      cache: 'no-store',
    });
  },

  acceptCustomQuote(publicId: string, options?: StoreRequestOptions) {
    return storeFetch<PublicCustomOrder>(`/store/custom-orders/${encodeURIComponent(publicId)}/accept-quote`, {
      ...options,
      method: 'POST',
      cache: 'no-store',
    });
  },

  approveCustomDesign(publicId: string, comment: string | undefined, options?: StoreRequestOptions) {
    return storeFetch<PublicCustomOrder>(`/store/custom-orders/${encodeURIComponent(publicId)}/approve-design`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ comment }),
      cache: 'no-store',
    });
  },

  requestCustomDesignChanges(publicId: string, comment: string | undefined, options?: StoreRequestOptions) {
    return storeFetch<PublicCustomOrder>(`/store/custom-orders/${encodeURIComponent(publicId)}/request-design-changes`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ comment }),
      cache: 'no-store',
    });
  },
};

export type { ListQuery };
