/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // If you ever use Turbopack in dev, keep the same alias there too
    turbo: {
      resolveAlias: {
        undici: false,
        '@fastify/busboy': false,
      },
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Hard block any accidental client import of undici & busboy
      config.resolve.alias = config.resolve.alias || {};
      config.resolve.alias.undici = false;
      config.resolve.alias['@fastify/busboy'] = false;
    }
    return config;
  },
};

export default nextConfig;
