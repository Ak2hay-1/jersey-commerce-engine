'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface Paginated<T> {
  items: T[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export function usePagedResource<T>(path: string, enabled = true) {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setData(await apiRequest<Paginated<T>>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
