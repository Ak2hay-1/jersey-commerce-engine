import { describe, expect, it, vi } from 'vitest';
import { cropToPngFile, type CropDeps } from './crop-image';

function fakeDeps() {
  const ctx = { clearRect: vi.fn(), drawImage: vi.fn(), imageSmoothingQuality: undefined as ImageSmoothingQuality | undefined };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob: (callback: (blob: Blob | null) => void, type?: string) => callback(new Blob(['png'], { type })),
  };
  const image = {} as CanvasImageSource;
  const deps: CropDeps = { loadImage: async () => image, createCanvas: () => canvas };
  return { ctx, canvas, image, deps };
}

describe('cropToPngFile', () => {
  it('draws the crop area onto a 512x512 canvas and returns a PNG file', async () => {
    const { ctx, canvas, image, deps } = fakeDeps();
    const file = await cropToPngFile('blob:logo', { x: 10, y: 20, width: 300, height: 300 }, { deps });

    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 10, 20, 300, 300, 0, 0, 512, 512);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('logo.png');
  });

  it('fails clearly when the canvas cannot export', async () => {
    const { deps, canvas } = fakeDeps();
    canvas.toBlob = (callback) => callback(null);
    await expect(cropToPngFile('blob:logo', { x: 0, y: 0, width: 1, height: 1 }, { deps })).rejects.toThrow(
      'Could not export the cropped logo.',
    );
  });
});
