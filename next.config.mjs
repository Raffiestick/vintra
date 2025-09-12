/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This allows the Next.js dev server to be accessed from the cloud workstation.
    allowedDevOrigins: ["*.cloudworkstations.dev"],
  },
};

export default nextConfig;
