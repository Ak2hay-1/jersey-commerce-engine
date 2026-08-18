import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@jersey-commerce/ui',
    '@jersey-commerce/types',
    '@jersey-commerce/validation',
    '@jersey-commerce/config',
    '@jersey-commerce/utils',
  ],
};

export default nextConfig;
