/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    // This allows Next.js to properly communicate with the browser in
    // a Cloud Workstations environment.
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
