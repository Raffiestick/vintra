/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is required for App Hosting to work with the App Router.
    outputFileTracingExcludes: {
      '*': [
        './node_modules/@swc/core-linux-x64-gnu',
        './node_modules/@swc/core-linux-x64-musl',
        './node_modules/@esbuild/linux-x64',
      ],
    },
    // This allowslist is required for the development environment to work correctly.
    allowedDevOrigins: ['https://*.cloudworkstations.dev'],
  },
};

export default nextConfig;
