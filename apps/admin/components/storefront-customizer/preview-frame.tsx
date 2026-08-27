'use client';

import { useEffect, useRef } from 'react';
import { CUSTOMIZER_DRAFT_MESSAGE, type CustomizerDraftPayload } from './types';

export function PreviewFrame({
  storefrontUrl,
  tenantSlug,
  draft,
  refreshKey,
}: {
  storefrontUrl: string;
  tenantSlug?: string;
  draft: CustomizerDraftPayload;
  refreshKey: number;
}): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const base = storefrontUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ customizer: '1' });
  if (tenantSlug) {
    params.set('tenant', tenantSlug);
  }
  const src = `${base}/?${params.toString()}`;

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) {
      return;
    }
    const timer = window.setTimeout(() => {
      frame.contentWindow?.postMessage({ type: CUSTOMIZER_DRAFT_MESSAGE, payload: draft }, base);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [base, draft, refreshKey]);

  return (
    <div className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-md border bg-muted/30">
      <iframe
        key={refreshKey}
        ref={iframeRef}
        title="Storefront preview"
        src={src}
        className="h-full min-h-[32rem] w-full flex-1 bg-background"
        onLoad={() => {
          iframeRef.current?.contentWindow?.postMessage(
            { type: CUSTOMIZER_DRAFT_MESSAGE, payload: draft },
            base,
          );
        }}
      />
    </div>
  );
}
