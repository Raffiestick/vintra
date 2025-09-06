/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Other experimental flags can go here
  },
  // Add allowedDevOrigins to the top level to resolve the cross-origin warning
  allowedDevOrigins: ["*.cloudworkstations.dev"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node-only deps from leaking into the browser build
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
