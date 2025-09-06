/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: ['*.cloudworkstations.dev'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node-only deps from being bundled into the browser build
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        undici: false,
        'node-fetch': false,
      };
    }
    return config;
  },
};

export default nextConfig;
