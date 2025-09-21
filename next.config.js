/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ✅ allow Studio’s preview origin(s) to reach the dev server
    allowedDevOrigins: [
      "https://9001-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
      "https://9099-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
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
