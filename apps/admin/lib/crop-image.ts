export type CropArea = { x: number; y: number; width: number; height: number };

type CanvasLike = {
  width: number;
  height: number;
  getContext(type: '2d'): {
    clearRect(x: number, y: number, w: number, h: number): void;
    drawImage(
      image: CanvasImageSource,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ): void;
    imageSmoothingQuality?: ImageSmoothingQuality;
  } | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string): void;
};

export type CropDeps = {
  loadImage: (src: string) => Promise<CanvasImageSource>;
  createCanvas: () => CanvasLike;
};

function browserDeps(): CropDeps {
  return {
    loadImage: (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.src = src;
      }),
    createCanvas: () => document.createElement('canvas'),
  };
}

/** Crops a square area to a size x size transparent PNG file. */
export async function cropToPngFile(
  imageSrc: string,
  area: CropArea,
  { size = 512, fileName = 'logo.png', deps = browserDeps() }: { size?: number; fileName?: string; deps?: CropDeps } = {},
): Promise<File> {
  const image = await deps.loadImage(imageSrc);
  const canvas = deps.createCanvas();
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image editing is not supported in this browser.');
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Could not export the cropped logo.');
  }
  return new File([blob], fileName, { type: 'image/png' });
}
