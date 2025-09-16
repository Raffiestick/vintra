/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ DO NOT set output: 'export'. We want SSR/standalone for App Hosting.
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // add any other hosts you actually use, one per line:
      // { protocol: 'https', hostname: 'your.cdn.com' },
    ],
  },
};

export default nextConfig;
