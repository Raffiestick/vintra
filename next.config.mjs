/** @type {import('next').NextConfig} */
const nextConfig = {
  // The `allowedDevOrigins` is not an experimental feature.
  // It should be at the top level of the configuration.
  experimental: {},
  // Add the allowed origin for the development server to prevent cross-origin warnings.
  // This is necessary when the dev UI is served from a different domain than the Next.js server.
  allowedDevOrigins: [
    "3000-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
    "3001-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev"
  ]
};

export default nextConfig;
