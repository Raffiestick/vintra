/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ✅ allow Studio’s preview origin(s) to reach the dev server
    allowedDevOrigins: [
      "*.cloudworkstations.dev",
    ],
  },
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
