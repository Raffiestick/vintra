/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '*.cloudworkstations.dev',
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

module.exports = nextConfig;
