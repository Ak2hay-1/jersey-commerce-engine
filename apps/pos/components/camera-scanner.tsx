'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, cn } from '@jersey-commerce/ui';
import type { PosLookupItem } from '@jersey-commerce/types';
import { Camera, Flashlight, FlashlightOff, SwitchCamera, X } from 'lucide-react';
import { createNativeBarcodeDetector, createZxingReader, supportsNativeBarcodeDetector } from '@/lib/barcode-decoder';
import { formatMoney } from '@/lib/format';
import { notifyScanSuccess } from '@/lib/scan-feedback';
import { resolveScan } from '@/lib/resolve-scan';

const COOLDOWN_MS = 1500;

function variantLabel(item: PosLookupItem): string {
  return [item.variant.size, item.variant.colour].filter(Boolean).join(' · ') || item.variant.sku;
}

function addedLabel(item: PosLookupItem): string {
  const sizeBit = [item.variant.size, item.variant.colour].filter(Boolean).join(' · ');
  return sizeBit ? `Added ${item.product.name} · ${sizeBit}` : `Added ${item.product.name}`;
}

type CameraPermission = 'pending' | 'granted' | 'denied' | 'unavailable';

export function CameraScanner({
  open,
  onClose,
  onAdd,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: PosLookupItem) => Promise<void>;
  busy?: boolean;
}): React.JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const nativeDetectorRef = useRef<ReturnType<typeof createNativeBarcodeDetector>>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const rafRef = useRef<number>(0);
  const cooldownUntilRef = useRef(0);
  const lastCodeRef = useRef('');
  const processingRef = useRef(false);
  const continuousRef = useRef(true);
  const onAddRef = useRef(onAdd);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  const [permission, setPermission] = useState<CameraPermission>('pending');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [continuous, setContinuous] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  /** Explicit device pick; `null` means let the browser choose the rear camera. */
  const [requestedDeviceId, setRequestedDeviceId] = useState<string | null>(null);
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);
  const [sizeChoices, setSizeChoices] = useState<PosLookupItem[] | null>(null);
  const [addingId, setAddingId] = useState('');

  useEffect(() => {
    onAddRef.current = onAdd;
    busyRef.current = busy;
    onCloseRef.current = onClose;
  }, [busy, onAdd, onClose]);

  useEffect(() => {
    continuousRef.current = continuous;
  }, [continuous]);

  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const showFlash = useCallback((message: string, ms = 1600) => {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? '' : current)), ms);
  }, []);

  const handleDecoded = useCallback(
    async (rawValue: string) => {
      const code = rawValue.trim();
      if (!code || processingRef.current || busyRef.current) {
        return;
      }
      const now = Date.now();
      if (code === lastCodeRef.current && now < cooldownUntilRef.current) {
        return;
      }
      processingRef.current = true;
      lastCodeRef.current = code;
      cooldownUntilRef.current = now + COOLDOWN_MS;
      setError('');
      try {
        const items = await resolveScan(code);
        if (items.length === 0) {
          showFlash(`No product found for ${code}`);
          return;
        }
        if (items.length > 1) {
          setSizeChoices(items);
          return;
        }
        const item = items[0]!;
        if (item.stockStatus === 'OUT_OF_STOCK') {
          showFlash(`${item.product.name} is out of stock`);
          return;
        }
        setAddingId(item.variant.id);
        await onAddRef.current(item);
        notifyScanSuccess();
        showFlash(addedLabel(item));
        if (!continuousRef.current) {
          onCloseRef.current();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scan lookup failed');
      } finally {
        setAddingId('');
        processingRef.current = false;
      }
    },
    [showFlash],
  );

  const startNativeLoop = useCallback(() => {
    const video = videoRef.current;
    const detector = nativeDetectorRef.current;
    if (!video || !detector) {
      return;
    }
    const tick = async (): Promise<void> => {
      if (!streamRef.current || !videoRef.current || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
        return;
      }
      try {
        const codes = await detector.detect(video);
        const first = codes.find((code) => code.rawValue?.trim());
        if (first?.rawValue) {
          await handleDecoded(first.rawValue);
        }
      } catch {
        // transient frame errors are fine
      }
      if (streamRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          void tick();
        });
      }
    };
    rafRef.current = requestAnimationFrame(() => {
      void tick();
    });
  }, [handleDecoded]);

  const startCamera = useCallback(
    async (preferredDeviceId?: string) => {
      stopStream();
      setPermission('pending');
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission('unavailable');
        setError('Camera API is not available in this browser.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: preferredDeviceId
          ? { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPermission('denied');
          setError(
            'Camera permission is blocked. In your phone browser, open site settings for admin.jerzyfy.in and allow Camera, then reopen Scan.',
          );
          return;
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setPermission('unavailable');
          setError('No camera was found on this device.');
          return;
        }
        setPermission('unavailable');
        setError(err instanceof Error ? err.message : 'Unable to open the camera.');
        return;
      }

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0] ?? null;
      trackRef.current = track;
      setPermission('granted');

      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(Boolean(caps?.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay can fail briefly; stream is still attached
        }
      }

      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter((device) => device.kind === 'videoinput');
        setDevices(cams);
        setActiveDeviceId(track?.getSettings().deviceId);
      } catch {
        // enumerateDevices is optional
      }

      if (supportsNativeBarcodeDetector()) {
        nativeDetectorRef.current = createNativeBarcodeDetector();
        if (nativeDetectorRef.current) {
          startNativeLoop();
          return;
        }
      }

      try {
        const { reader } = await createZxingReader();
        const controls = await reader.decodeFromStream(stream, videoRef.current ?? undefined, (result) => {
          if (result) {
            void handleDecoded(result.getText());
          }
        });
        zxingControlsRef.current = controls;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Barcode decoder failed to start.');
      }
    },
    [handleDecoded, startNativeLoop, stopStream],
  );

  useEffect(() => {
    if (!open) {
      stopStream();
      setSizeChoices(null);
      setFlash('');
      setError('');
      return;
    }
    void startCamera(requestedDeviceId ?? undefined);
    return () => stopStream();
    // Re-run when the user switches cameras; startCamera identity is intentionally ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open/device restart
  }, [open, requestedDeviceId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onVisibility(): void {
      if (document.hidden) {
        stopStream();
      } else if (open) {
        void startCamera(requestedDeviceId ?? undefined);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [requestedDeviceId, open, startCamera, stopStream]);

  async function toggleTorch(): Promise<void> {
    const track = trackRef.current;
    if (!track || !torchSupported) {
      return;
    }
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function switchCamera(): void {
    if (devices.length < 2) {
      return;
    }
    const currentId = activeDeviceId ?? requestedDeviceId ?? devices[0]?.deviceId;
    const index = Math.max(
      0,
      devices.findIndex((device) => device.deviceId === currentId),
    );
    const next = devices[(index + 1) % devices.length];
    if (next) {
      setRequestedDeviceId(next.deviceId);
    }
  }

  async function pickSize(item: PosLookupItem): Promise<void> {
    if (item.stockStatus === 'OUT_OF_STOCK' || busy) {
      return;
    }
    setAddingId(item.variant.id);
    setError('');
    try {
      await onAdd(item);
      notifyScanSuccess();
      showFlash(addedLabel(item));
      setSizeChoices(null);
      lastCodeRef.current = '';
      if (!continuous) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add item');
    } finally {
      setAddingId('');
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white sm:items-center sm:justify-center sm:bg-black/70 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode or QR code"
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-black sm:h-[min(90vh,44rem)] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl">
        <div className="relative z-20 flex items-center justify-between gap-2 px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Scan jersey tag</p>
            <p className="truncate text-xs text-white/70">Point at the QR or barcode</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Close scanner"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:h-56 sm:w-72" />
          </div>
          {flash ? (
            <div className="absolute inset-x-4 top-4 z-10 rounded-xl bg-emerald-700/95 px-3 py-2 text-center text-sm font-medium shadow-lg">
              {flash}
            </div>
          ) : null}
          {permission === 'pending' ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 px-6 text-center text-sm">
              Starting camera…
            </div>
          ) : null}
          {permission === 'denied' || permission === 'unavailable' ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
              <Camera className="h-10 w-10 text-white/70" />
              <p className="text-sm leading-relaxed text-white/90">{error || 'Camera unavailable.'}</p>
              <Button type="button" variant="secondary" onClick={() => void startCamera(requestedDeviceId ?? undefined)}>
                Try again
              </Button>
            </div>
          ) : null}
        </div>

        <div className="z-20 space-y-3 border-t border-white/10 bg-black/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && permission === 'granted' ? <p className="text-sm text-red-300">{error}</p> : null}
          <label className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm">
            <span>Keep scanning</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-[hsl(var(--primary))]"
              checked={continuous}
              onChange={(event) => setContinuous(event.target.checked)}
            />
          </label>
          <div className="flex items-center gap-2">
            {torchSupported ? (
              <Button
                type="button"
                variant="secondary"
                className="h-12 flex-1 rounded-xl bg-white/15 text-white hover:bg-white/25"
                onClick={() => void toggleTorch()}
              >
                {torchOn ? <FlashlightOff className="mr-2 h-4 w-4" /> : <Flashlight className="mr-2 h-4 w-4" />}
                Torch
              </Button>
            ) : null}
            {devices.length > 1 ? (
              <Button
                type="button"
                variant="secondary"
                className="h-12 flex-1 rounded-xl bg-white/15 text-white hover:bg-white/25"
                onClick={switchCamera}
              >
                <SwitchCamera className="mr-2 h-4 w-4" />
                Switch
              </Button>
            ) : null}
          </div>
        </div>

        {sizeChoices ? (
          <div className="absolute inset-0 z-30 flex flex-col bg-black/92 p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">{sizeChoices[0]?.product.name ?? 'Choose size'}</p>
                <p className="text-sm text-white/70">Several sizes match this code — pick one.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/15 text-white"
                aria-label="Close size picker"
                onClick={() => setSizeChoices(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {sizeChoices.map((item) => {
                const out = item.stockStatus === 'OUT_OF_STOCK';
                return (
                  <button
                    key={item.variant.id}
                    type="button"
                    disabled={out || busy || addingId === item.variant.id}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left',
                      out && 'opacity-50',
                    )}
                    onClick={() => void pickSize(item)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{variantLabel(item)}</p>
                      <p className="truncate text-xs text-white/60">{item.variant.sku}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatMoney(item.variant.sellingPrice)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
