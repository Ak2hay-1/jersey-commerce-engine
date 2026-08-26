'use client';

import { useParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';

const PLACEHOLDERS = new Set(['__id__', '[id]', '__variantId__', '[variantId]']);

function lastSegment(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

/**
 * Resolve a dynamic route segment for Next static export + host rewrites.
 * Prefer real URL segments over generateStaticParams placeholders (`__id__`).
 */
export function resolveRouteParam(
  pathname: string,
  paramValue: string | string[] | undefined,
  browserPathname?: string,
): string {
  const fromParams = Array.isArray(paramValue) ? paramValue[0] : paramValue;
  if (typeof fromParams === 'string' && fromParams.length > 0 && !PLACEHOLDERS.has(fromParams)) {
    return fromParams;
  }

  for (const path of [browserPathname, pathname]) {
    if (!path) {
      continue;
    }
    const fromPath = lastSegment(path);
    if (fromPath && !PLACEHOLDERS.has(fromPath)) {
      return fromPath;
    }
  }

  return typeof fromParams === 'string' ? fromParams : '';
}

/**
 * Resolve a dynamic route segment for Next static export + host rewrites.
 * `useParams()` / `usePathname()` often return the generateStaticParams placeholder
 * (`__id__`) when Vercel serves `/resource/[id]/index.html` for `/resource/new`.
 */
export function useRouteParam(name: 'id' | 'variantId' = 'id'): string {
  const params = useParams();
  const pathname = usePathname();

  return useMemo(() => {
    const browserPathname = typeof window !== 'undefined' ? window.location.pathname : '';
    return resolveRouteParam(pathname, params?.[name], browserPathname);
  }, [name, params, pathname]);
}
