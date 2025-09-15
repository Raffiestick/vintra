/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // NOTE: 'allowedDevOrigins' is intentionally left out of experimental.
    // It is now a top-level property.
  },
  // This is the correct top-level placement for the key.
  allowedDevOrigins: [
    'https://*.cloudworkstations.dev',
    'https://*.firebase.app',
    'https://*.web.app',
  ],
  webpack: (config, { isServer }) => {
    // Exclude specific modules from the server bundle to prevent errors.
    if (isServer) {
      config.externals.push('canvas', '@google-cloud/vertexai');
    }
    return config;
  },
};

export default nextConfig;
