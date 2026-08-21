'use client';

import { useCallback, useEffect, useState } from 'react';
import { realtimeAffectsResource } from '@jersey-commerce/utils';
import { apiRequest } from '@/lib/api';
import { useRealtimeReload } from '@/lib/realtime';

interface Paginated<T> {
  items: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function usePagedResource<T>(path: string, enabled = true) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(
    async (silent = false) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      setError('');
      try {
        setData(await apiRequest<Paginated<T>>(path));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load data');
      } finally {
        setLoading(false);
      }
    },
    [path, enabled],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeReload(
    (event) => realtimeAffectsResource(path, event.entity),
    () => reload(true),
  );

  return { data, loading, error, reload };
}
