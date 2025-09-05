/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    allowedDevOrigins: ['*.cloudworkstations.dev'],
  },
  webpack: (config, { isServer }) => {
    //
    // This is the fix for the "Module parse failed: Unexpected token" error
    // related to 'undici'. The 'undici' package is a server-side dependency
    // of 'firebase/functions' and should not be bundled into client-side code.
    //
    // By adding this alias, we are telling Webpack to replace any import of
    // 'undici' with a harmless empty module when building for the client,
    // which resolves the build error. This has no effect on the server build.
    //
    if (!isServer) {
      config.resolve.alias.undici = false;
    }
    return config;
  },
};

export default nextConfig;
