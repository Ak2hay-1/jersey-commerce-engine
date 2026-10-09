'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@jersey-commerce/ui';
import { resolveMediaUrl } from '@/lib/env';
import { LogoCropDialog } from './logo-crop-dialog';

const MAX_BYTES = 5 * 1024 * 1024;
const DARK_CHECKERBOARD = 'repeating-conic-gradient(#1c1c1c 0% 25%, #0e0e0e 0% 50%) 50% / 12px 12px';

export function LogoField({
  value,
  canEdit,
  upload,
  onChange,
  onError,
}: {
  value?: string | null;
  canEdit: boolean;
  upload: (file: File) => Promise<string>;
  onChange: (url: string | null) => void;
  onError: (error: Error) => void;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  function pickFile() {
    setConfirmRemove(false);
    inputRef.current?.click();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      onError(new Error('Logo must be 5 MB or smaller.'));
      return;
    }
    setSource(URL.createObjectURL(file));
  }

  async function onApply(file: File) {
    setUploading(true);
    try {
      onChange(await upload(file));
      setSource(null);
    } catch (err) {
      onError(err as Error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div
        className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[18%] border"
        style={{ background: DARK_CHECKERBOARD }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(value)} alt="Shop logo" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[11px] uppercase tracking-wide text-white/40">No logo</span>
        )}
      </div>

      {canEdit ? (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {value ? (
            confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Remove the logo?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    onChange(null);
                    setConfirmRemove(false);
                  }}
                >
                  Remove
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmRemove(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={pickFile} disabled={uploading}>
                  {uploading ? <Spinner /> : null}
                  Change
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmRemove(true)}
                  disabled={uploading}
                >
                  Remove
                </Button>
              </div>
            )
          ) : (
            <Button type="button" size="sm" onClick={pickFile} disabled={uploading}>
              {uploading ? <Spinner /> : null}
              Add logo
            </Button>
          )}
          <p className="max-w-xs text-xs text-muted-foreground">
            Square logo, shown with rounded corners in the storefront header. Click Save to publish.
          </p>
        </div>
      ) : null}

      <LogoCropDialog
        imageSrc={source}
        open={Boolean(source)}
        busy={uploading}
        onCancel={() => setSource(null)}
        onApply={(file) => void onApply(file)}
      />
    </div>
  );
}

function Spinner(): React.JSX.Element {
  return <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}
