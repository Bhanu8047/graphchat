/** @type {import('next').NextConfig} */
const path = require('path');

const aliases = {
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

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {
    resolveAlias: aliases,
  },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), ...aliases };
    return config;
  },
};
module.exports = nextConfig;
