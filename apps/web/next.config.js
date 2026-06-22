/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@matchmaking/shared'],
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
};

module.exports = nextConfig;