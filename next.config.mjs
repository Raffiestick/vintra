/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is the correct configuration for the warning you were seeing.
    allowedDevOrigins: ["3000-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev", "3001-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev"],
  },
};

export default nextConfig;
