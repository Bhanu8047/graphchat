import * as path from 'node:path';
import type { NextConfig } from 'next';

const aliases: Record<string, string> = {
  '@vectorgraph/shared-types': path.resolve(
    __dirname,
    '../../libs/shared-types/src/index.ts',
  ),
  '@vectorgraph/vector-client': path.resolve(
    __dirname,
    '../../libs/vector-client/src/index.ts',
  ),
  '@vectorgraph/ai': path.resolve(__dirname, '../../libs/ai/src/index.ts'),
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    '@vectorgraph/shared-types',
    '@vectorgraph/vector-client',
    '@vectorgraph/ai',
  ],
  turbopack: {
    resolveAlias: aliases,
  },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), ...aliases };
    return config;
  },
};

export default nextConfig;
