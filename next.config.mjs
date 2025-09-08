/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // No longer placing allowedDevOrigins here
  },
  // Add the allowedDevOrigins at the top level
  allowedDevOrigins: ["https://*.cloudworkstations.dev"],
};

export default nextConfig;
