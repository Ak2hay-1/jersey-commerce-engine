import path from 'node:path';
import type { NextConfig } from 'next';

function apiImagePattern(): Array<{ protocol: 'http' | 'https'; hostname: string; port?: string }> {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    return [];
  }
  try {
    const url = new URL(raw);
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    return [
      {
        protocol,
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
  transpilePackages: [
    '@jersey-commerce/ui',
    '@jersey-commerce/types',
    '@jersey-commerce/validation',
    '@jersey-commerce/config',
    '@jersey-commerce/utils',
    'three',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      ...apiImagePattern(),
    ],
  },
};

export default nextConfig;
