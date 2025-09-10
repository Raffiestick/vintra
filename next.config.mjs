/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // allow your Cloud Workstations host(s) in dev
  allowedDevOrigins: [
    '*.cloudworkstations.dev',
    // optional: pin the exact host you saw in the warning
    '3001-firebase-studio-1756843660830.cluster-pgviq6mvsncnqxx6kr7pbz65v6.cloudworkstations.dev',
  ],
};

export default nextConfig;
