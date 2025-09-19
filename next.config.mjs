/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      "4000-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
    ],
  },
};

export default nextConfig;
