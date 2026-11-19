import path from 'node:path';
import type { NextConfig } from 'next';
import { storefrontSecurityHeaders } from './lib/security-headers';

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
  poweredByHeader: false,
  async headers() {
    const security = storefrontSecurityHeaders();
    const publicCache = {
      key: 'Cache-Control',
      value: 'public, s-maxage=300, stale-while-revalidate=600',
    };
    const privateNoStore = {
      key: 'Cache-Control',
      value: 'private, no-store',
    };
    return [
      { source: '/:path*', headers: security },
      {
        source: '/cart',
        headers: [...security, privateNoStore],
      },
      {
        source: '/checkout',
        headers: [...security, privateNoStore],
      },
      {
        source: '/account/:path*',
        headers: [...security, privateNoStore],
      },
      {
        source: '/auth/:path*',
        headers: [...security, privateNoStore],
      },
      {
        source: '/wishlist',
        headers: [...security, privateNoStore],
      },
      {
        source: '/',
        headers: [...security, publicCache],
      },
      {
        source: '/products',
        headers: [...security, publicCache],
      },
      {
        source: '/products/:path*',
        headers: [...security, publicCache],
      },
      {
        source: '/category/:path*',
        headers: [...security, publicCache],
      },
      {
        source: '/about',
        headers: [...security, publicCache],
      },
      {
        source: '/contact',
        headers: [...security, publicCache],
      },
      {
        source: '/size-chart',
        headers: [...security, publicCache],
      },
      {
        source: '/quality-check',
        headers: [...security, publicCache],
      },
      {
        source: '/privacy',
        headers: [...security, publicCache],
      },
      {
        source: '/terms',
        headers: [...security, publicCache],
      },
      {
        source: '/refund-policy',
        headers: [...security, publicCache],
      },
      {
        source: '/shipping-policy',
        headers: [...security, publicCache],
      },
      {
        source: '/grievance',
        headers: [...security, publicCache],
      },
      {
        source: '/wholesale',
        headers: [...security, publicCache],
      },
      {
        source: '/custom-orders',
        headers: [...security, publicCache],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/category/ac-milan-26-27-away-master-version',
        destination: '/category/player-versions',
        permanent: true,
      },
      {
        source: '/auth/signup',
        destination: '/auth/register',
        permanent: false,
      },
    ];
  },
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
      ...(process.env.NODE_ENV === 'production'
        ? []
        : [
            { protocol: 'http' as const, hostname: 'localhost' },
            { protocol: 'http' as const, hostname: '127.0.0.1' },
          ]),
      ...apiImagePattern(),
    ],
  },
};

export default nextConfig;
