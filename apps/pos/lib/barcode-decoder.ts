export type DecodedBarcode = {
  rawValue: string;
  format?: string;
};

const NATIVE_FORMATS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39'] as const;

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

export function supportsNativeBarcodeDetector(): boolean {
  return Boolean(getBarcodeDetectorCtor());
}

export function createNativeBarcodeDetector(): BarcodeDetectorLike | null {
  const Ctor = getBarcodeDetectorCtor();
  if (!Ctor) {
    return null;
  }
  try {
    return new Ctor({ formats: [...NATIVE_FORMATS] });
  } catch {
    try {
      return new Ctor();
    } catch {
      return null;
    }
  }
}

type ZxingModule = typeof import('@zxing/browser');
type ZxingLibrary = typeof import('@zxing/library');

let zxingPromise: Promise<{ browser: ZxingModule; library: ZxingLibrary }> | null = null;

export function loadZxing(): Promise<{ browser: ZxingModule; library: ZxingLibrary }> {
  zxingPromise ??= Promise.all([import('@zxing/browser'), import('@zxing/library')]).then(([browser, library]) => ({
    browser,
    library,
  }));
  return zxingPromise;
}

export async function createZxingReader(): Promise<{
  reader: InstanceType<ZxingModule['BrowserMultiFormatReader']>;
  hints: Map<unknown, unknown>;
}> {
  const { browser, library } = await loadZxing();
  const hints = new Map();
  hints.set(library.DecodeHintType.POSSIBLE_FORMATS, [
    library.BarcodeFormat.QR_CODE,
    library.BarcodeFormat.EAN_13,
    library.BarcodeFormat.EAN_8,
    library.BarcodeFormat.UPC_A,
    library.BarcodeFormat.CODE_128,
    library.BarcodeFormat.CODE_39,
  ]);
  hints.set(library.DecodeHintType.TRY_HARDER, true);
  const reader = new browser.BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 250,
    delayBetweenScanSuccess: 800,
  });
  return { reader, hints };
}
