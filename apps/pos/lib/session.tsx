'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PosSessionDto } from '@jersey-commerce/types';
import { getCurrentSession } from './pos-api';
import { useRealtimeReload } from './realtime';

interface PosSessionState {
  loading: boolean;
  session: PosSessionDto | null;
  error: string;
  refresh: () => Promise<PosSessionDto | null>;
}

const PosSessionContext = createContext<PosSessionState | null>(null);

export function PosSessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PosSessionDto | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const next = await getCurrentSession();
      setSession(next);
      return next;
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Unable to load the POS session');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeReload(
    (event) => event.entity === 'PosSession' || event.entity === 'Sale',
    () => {
      void refresh();
    },
  );

  const value = useMemo<PosSessionState>(
    () => ({ loading, session, error, refresh }),
    [error, loading, refresh, session],
  );

  return <PosSessionContext.Provider value={value}>{children}</PosSessionContext.Provider>;
}

export function usePosSession(): PosSessionState {
  const ctx = useContext(PosSessionContext);
  if (!ctx) {
    throw new Error('usePosSession must be used within PosSessionProvider');
  }
  return ctx;
}
