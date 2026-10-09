'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@jersey-commerce/ui';
import { cropToPngFile } from '@/lib/crop-image';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const CHECKERBOARD =
  'repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 50% / 16px 16px';

export function LogoCropDialog({
  imageSrc,
  open,
  busy,
  onCancel,
  onApply,
}: {
  imageSrc: string | null;
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onApply: (file: File) => void;
}): React.JSX.Element {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [areaPercent, setAreaPercent] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setError(null);
    }
  }, [open, imageSrc, reset]);

  async function apply() {
    if (!imageSrc || !areaPixels) {
      return;
    }
    try {
      onApply(await cropToPngFile(imageSrc, areaPixels));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !busy ? onCancel() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust logo</DialogTitle>
          <DialogDescription>Drag to position and zoom to fit. The logo is saved as a square transparent PNG.</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-md border sm:h-80" style={{ background: CHECKERBOARD }}>
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={1}
              cropShape="rect"
              objectFit="contain"
              restrictPosition={false}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(percent, pixels) => {
                setAreaPercent(percent);
                setAreaPixels(pixels);
              }}
              style={{ containerStyle: { background: 'transparent' }, cropAreaStyle: { borderRadius: '18%' } }}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="logo-zoom" className="text-sm text-muted-foreground">
            Zoom
          </label>
          <input
            id="logo-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1 cursor-pointer accent-foreground"
          />
          <span className="w-12 text-right text-sm tabular-nums">{zoom.toFixed(1)}x</span>
          <Button type="button" variant="outline" size="sm" onClick={reset} disabled={busy}>
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-md bg-[#0e0e0e] px-4 py-3">
          <LogoPreview imageSrc={imageSrc} area={areaPercent} />
          <span className="text-xs text-white/60">Preview in the storefront header</span>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void apply()} disabled={busy || !areaPixels}>
            {busy ? 'Uploading...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogoPreview({ imageSrc, area }: { imageSrc: string | null; area: Area | null }): React.JSX.Element {
  return (
    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-[18%]">
      {imageSrc && area && area.width > 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          className="absolute max-w-none"
          style={{
            width: `${10000 / area.width}%`,
            left: `${(-area.x * 100) / area.width}%`,
            top: `${(-area.y * 100) / area.height}%`,
          }}
        />
      ) : null}
    </span>
  );
}
