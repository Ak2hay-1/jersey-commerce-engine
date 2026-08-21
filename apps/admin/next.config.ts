import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
// Static export is for production/VM/desktop packs. Keep it off in `next dev`
// so the local server is not mixed with a previous `next build` export cache.
const useStaticExport = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  ...(useStaticExport ? { output: 'export' as const } : {}),
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@jersey-commerce/ui',
    '@jersey-commerce/types',
    '@jersey-commerce/validation',
    '@jersey-commerce/config',
    '@jersey-commerce/utils',
  ],
};

export default nextConfig;
