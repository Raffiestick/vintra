/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is the correct location for this experimental flag
    allowedDevOrigins: ["3000-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev", "3001-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev"],
  },
  reactStrictMode: true,
};

export default nextConfig;
