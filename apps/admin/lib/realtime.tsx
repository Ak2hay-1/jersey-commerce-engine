'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeEvent } from '@jersey-commerce/types';
import { openRealtimeSocket, REALTIME_OFFLINE_DEBOUNCE_MS } from '@jersey-commerce/utils';
import { getApiUrl } from './env';
import { readAccessToken } from './api';
import { useAuth } from './auth';

type Listener = (event: RealtimeEvent) => void;

export type RealtimeConnectionStatus = 'live' | 'connecting' | 'offline';

interface RealtimeState {
  connected: boolean;
  status: RealtimeConnectionStatus;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeState | null>(null);

function RealtimeInner({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>('offline');
  const listeners = useRef(new Set<Listener>());
  const userId = auth.user?.id ?? '';

  useEffect(() => {
    const token = readAccessToken();
    if (!userId || !token) {
      setStatus('offline');
      return;
    }

    setStatus('connecting');
    const handle = openRealtimeSocket({
      apiUrl: getApiUrl(),
      token,
      offlineDebounceMs: REALTIME_OFFLINE_DEBOUNCE_MS,
      onEvent: (event) => {
        listeners.current.forEach((listener) => listener(event));
      },
      onStatus: (connected) => {
        setStatus(connected ? 'live' : 'offline');
      },
    });

    return () => {
      handle.close();
      setStatus('offline');
    };
  }, [userId]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo<RealtimeState>(
    () => ({
      connected: status === 'live',
      status,
      subscribe,
    }),
    [status, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function RealtimeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return <RealtimeInner>{children}</RealtimeInner>;
}

export function useRealtime(): RealtimeState {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}

export function useRealtimeReload(
  match: (event: RealtimeEvent) => boolean,
  reload: () => void | Promise<void>,
): void {
  const { subscribe } = useRealtime();
  const matchRef = useRef(match);
  const reloadRef = useRef(reload);
  matchRef.current = match;
  reloadRef.current = reload;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribe((event) => {
      if (!matchRef.current(event)) {
        return;
      }
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void reloadRef.current();
      }, 150);
    });
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [subscribe]);
}
