/** @type {import('next').NextConfig} */
const nextConfig = {
  // The 'allowedDevOrigins' option is part of Next.js's security measures for the development server.
  // It specifies which origins are allowed to make cross-origin requests, which is necessary
  // in a cloud development environment like this where the frontend is served from a different
  // origin than the preview iframe.
  experimental: {
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
    ],
  },
};

export default nextConfig;
