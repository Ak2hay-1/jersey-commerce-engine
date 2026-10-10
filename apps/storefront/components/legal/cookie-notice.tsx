'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jce_cookie_notice_v1';

/**
 * Informational notice only: the store sets essential cookies (cart, sign-in,
 * shop, order access) and no analytics or ad trackers. Any future analytics
 * must be gated behind explicit consent rather than this dismissal.
 */
export function CookieNotice(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== 'dismissed');
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  function dismiss(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // Private mode: hide for this page view only.
    }
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-foreground/10 bg-background/95 p-4 text-sm shadow-xl backdrop-blur sm:flex-row sm:items-center sm:gap-5"
    >
      <p className="flex-1 leading-relaxed text-muted-foreground">
        We use only essential cookies to keep your cart and sign-in working — no ads or tracking.{' '}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          Privacy policy
        </Link>
      </p>
      <button type="button" className="btn btn-primary shrink-0 cursor-pointer" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
