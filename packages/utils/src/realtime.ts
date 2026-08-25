export interface RealtimeEventPayload {
  action: string;
  entity: string;
  entityId: string;
  at: string;
}

const RESOURCE_ENTITIES: Record<string, readonly string[]> = {
  sales: ['Sale', 'PosCart', 'PosCartItem', 'Payment'],
  orders: ['Order', 'Cart', 'Payment'],
  products: ['Product', 'ProductVariant', 'ProductImage', 'Inventory', 'Category'],
  inventory: ['Inventory', 'Product', 'ProductVariant'],
  categories: ['Category'],
  customers: ['Customer', 'CustomerNote', 'CustomerTag'],
  suppliers: ['Supplier'],
  purchases: ['Purchase', 'SupplierPayment'],
  payments: ['Payment', 'Sale', 'Order'],
  refunds: ['Sale', 'Payment'],
  expenses: ['Expense'],
  users: ['User'],
  website: ['WebsiteSettings', 'WebsiteMedia'],
  'promo-codes': ['PromoCode'],
  'custom-orders': ['CustomOrder', 'CustomOrderQuote', 'CustomOrderDesign'],
  reports: [
    'Sale',
    'Order',
    'Payment',
    'Purchase',
    'Expense',
    'Customer',
    'Inventory',
    'CustomOrder',
    'SupplierPayment',
  ],
  dashboard: [
    'Sale',
    'Order',
    'Payment',
    'Purchase',
    'Expense',
    'Customer',
    'Inventory',
    'CustomOrder',
    'PosSession',
  ],
  'pos.sales': ['Sale', 'Payment'],
  'pos.carts': ['PosCart', 'PosCartItem'],
  'pos.sessions': ['PosSession', 'Sale'],
};

function resourceKeyFromPath(path: string): string {
  const segments = (path.split('?')[0] ?? '')
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);
  if (segments[0] === 'pos' && segments[1]) {
    return `pos.${segments[1]}`;
  }
  return segments[0] ?? '';
}

export function realtimeAffectsResource(path: string, entity: string): boolean {
  const key = resourceKeyFromPath(path);
  const entities = RESOURCE_ENTITIES[key];
  return Boolean(entities?.includes(entity));
}

export function shouldPublishRealtime(action: string, tenantId?: string): boolean {
  if (!tenantId) {
    return false;
  }
  if (action.startsWith('auth.')) {
    return false;
  }
  if (action === 'reports.exported') {
    return false;
  }
  return true;
}

export const REALTIME_PATH = '/realtime';

/** Delay before reporting Offline so brief reconnects do not flicker the badge. */
export const REALTIME_OFFLINE_DEBOUNCE_MS = 2000;

export interface RealtimeSocketHandle {
  close: () => void;
}

export function openRealtimeSocket(options: {
  apiUrl: string;
  token: string;
  onEvent: (event: RealtimeEventPayload) => void;
  onStatus: (connected: boolean) => void;
  offlineDebounceMs?: number;
}): RealtimeSocketHandle {
  const SocketCtor = (globalThis as {
    WebSocket?: new (url: string) => {
      addEventListener(type: string, listener: (event: { data?: unknown }) => void): void;
      close: () => void;
    };
  }).WebSocket;
  if (!SocketCtor) {
    return { close: () => undefined };
  }

  const offlineDebounceMs = options.offlineDebounceMs ?? REALTIME_OFFLINE_DEBOUNCE_MS;
  let closed = false;
  let socket: InstanceType<typeof SocketCtor> | null = null;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let offlineTimer: ReturnType<typeof setTimeout> | undefined;

  const clearOfflineTimer = (): void => {
    if (offlineTimer) {
      clearTimeout(offlineTimer);
      offlineTimer = undefined;
    }
  };

  const reportOffline = (immediate: boolean): void => {
    clearOfflineTimer();
    if (immediate || offlineDebounceMs <= 0) {
      options.onStatus(false);
      return;
    }
    offlineTimer = setTimeout(() => {
      if (!closed) {
        options.onStatus(false);
      }
    }, offlineDebounceMs);
  };

  const connect = (): void => {
    if (closed) {
      return;
    }
    const base = options.apiUrl.replace(/^http/i, 'ws').replace(/\/$/, '');
    const url = `${base}${REALTIME_PATH}?token=${encodeURIComponent(options.token)}`;
    socket = new SocketCtor(url);
    socket.addEventListener('open', () => {
      attempt = 0;
      clearOfflineTimer();
      options.onStatus(true);
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as RealtimeEventPayload;
        if (payload?.entity && payload.action) {
          options.onEvent(payload);
        }
      } catch {
        /* ignore malformed frames */
      }
    });
    socket.addEventListener('close', () => {
      if (closed) {
        return;
      }
      reportOffline(false);
      const delay = Math.min(10_000, 400 * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
    socket.addEventListener('error', () => {
      socket?.close();
    });
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      clearOfflineTimer();
      options.onStatus(false);
      socket?.close();
    },
  };
}
