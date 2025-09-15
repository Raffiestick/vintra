/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep this empty for now unless other experimental flags are needed.
  },
  // The allowedDevOrigins key must be at the top level.
  allowedDevOrigins: ["https://*.cloudworkstations.dev"],
};

export default nextConfig;
