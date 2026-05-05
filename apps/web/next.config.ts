import * as path from 'node:path';
import type { NextConfig } from 'next';

const aliases: Record<string, string> = {
  '@graphchat/shared-types': path.resolve(
    __dirname,
    '../../libs/shared-types/src/index.ts',
  ),
  '@graphchat/vector-client': path.resolve(
    __dirname,
    '../../libs/vector-client/src/index.ts',
  ),
  '@graphchat/ai': path.resolve(__dirname, '../../libs/ai/src/index.ts'),
};

// Conservative defaults; tighten in production via APP_TRUSTED_HOSTS / CSP.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Stops other origins from embedding this app in an iframe (clickjacking
  // and "running our website on his domain" via iframe).
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: [
    '@graphchat/shared-types',
    '@graphchat/vector-client',
    '@graphchat/ai',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    resolveAlias: aliases,
  },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), ...aliases };
    return config;
  },
};

export default nextConfig;
