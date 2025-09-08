/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is required to allow the Next.js dev server to accept requests from the
    // Firebase Studio environment, which runs on a different origin.
    allowedDevOrigins: ["*.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev"],
  },
};

export default nextConfig;
