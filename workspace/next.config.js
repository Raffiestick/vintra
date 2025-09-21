/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is an empty block, but we leave it in case other experimental
    // features are added in the future.
  },
  // ✅ allow Studio’s preview origin(s) to reach the dev server
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
