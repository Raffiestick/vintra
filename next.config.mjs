/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This key is required to be present, even if empty,
    // to acknowledge the use of experimental features.
  },
  // allowedDevOrigins must be a top-level key.
  allowedDevOrigins: [
    "https://*.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
  ],
};

export default nextConfig;
