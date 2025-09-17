/** @type {import('next').NextConfig} */
const nextConfig = {
  // SSR build for App Hosting; do NOT static export.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // add any others you actually use
    ],
  },
};

export default nextConfig;
