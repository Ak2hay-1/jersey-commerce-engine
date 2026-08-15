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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
};

export default nextConfig;
