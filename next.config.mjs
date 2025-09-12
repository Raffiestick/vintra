/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Other experimental flags can go here if needed
  },
  // allowedDevOrigins is an experimental feature, but it's configured at the top level.
  allowedDevOrigins: ["https://*.cloudworkstations.dev"],
};

export default nextConfig;
