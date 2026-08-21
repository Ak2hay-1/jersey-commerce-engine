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
import { openRealtimeSocket } from '@jersey-commerce/utils';
import { getApiUrl } from './env';
import { readAccessToken } from './api';
import { useAuth } from './auth';

type Listener = (event: RealtimeEvent) => void;

interface RealtimeState {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeState | null>(null);

function RealtimeInner({ children }: { children: ReactNode }): React.JSX.Element {
  const auth = useAuth();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<Listener>());
  const userId = auth.user?.id ?? '';

  useEffect(() => {
    const token = readAccessToken();
    if (!userId || !token) {
      setConnected(false);
      return;
    }
    const handle = openRealtimeSocket({
      apiUrl: getApiUrl(),
      token,
      onEvent: (event) => {
        listeners.current.forEach((listener) => listener(event));
      },
      onStatus: setConnected,
    });
    return () => handle.close();
  }, [userId]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo<RealtimeState>(() => ({ connected, subscribe }), [connected, subscribe]);

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
