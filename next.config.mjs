/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR build for Firebase App Hosting; DO NOT export statically.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
      // If other remote hosts are used in the app, add them here.
    ],
  },
};

export default nextConfig;
