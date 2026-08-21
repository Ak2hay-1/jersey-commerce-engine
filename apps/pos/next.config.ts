import type { NextConfig } from 'next';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

const nextConfig: NextConfig = {
  output: 'export',
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
