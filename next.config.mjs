/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Add the following to address the cross-origin warning in dev mode
  experimental: {
    allowedDevOrigins: ["https://*.cloudworkstations.dev"],
  },
};

export default nextConfig;
