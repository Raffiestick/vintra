/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow all preview origins from Cloud Workstations.
  allowedDevOrigins: ['*.cloudworkstations.dev'],
  
  // Configure allowed image hostnames.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

module.exports = nextConfig;