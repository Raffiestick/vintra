
/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is required for the cloud editor to work.
  // We can remove this when we deploy to production.
  devIndicators: {
    allowedDevOrigins: [
      "4000-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev",
    ],
  },
};

export default nextConfig;
