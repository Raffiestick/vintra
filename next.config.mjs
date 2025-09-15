/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
        ],
    },
    experimental: {
        // This allows the dev server to be accessed from the cloud workstation URL
        allowedDevOrigins: [
            "https://*.cloudworkstations.dev",
            "https://*.firebase.app",
            "https://*.web.app",
        ],
    }
};

export default nextConfig;
