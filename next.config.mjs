/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // If something accidentally pulls undici into the client, drop it.
      config.resolve.alias.undici = false;
    }
    return config;
  },
};

export default nextConfig;