import sharp from 'sharp';

export const IMAGE_OPTIMIZE_MAX_EDGE = 1600;
export const IMAGE_OPTIMIZE_WEBP_QUALITY = 80;

export type OptimizedImage = {
  buffer: Buffer;
  contentType: 'image/webp';
  extension: 'webp';
};

/** Resize (max edge) and convert uploads to WebP for storefront/share weight. */
export async function optimizeImageToWebp(input: Buffer): Promise<OptimizedImage> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: IMAGE_OPTIMIZE_MAX_EDGE,
      height: IMAGE_OPTIMIZE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: IMAGE_OPTIMIZE_WEBP_QUALITY, effort: 4 })
    .toBuffer();
  return { buffer, contentType: 'image/webp', extension: 'webp' };
}
