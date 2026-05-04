/** @type {import('next').NextConfig} */
const { version } = require('./package.json');

const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
    },
    reactStrictMode: true,
    output: 'standalone',
    transpilePackages: ['lucide-react', 'qrcode.react'],
    experimental: {
        serverComponentsExternalPackages: ['better-sqlite3']
    },

    async headers() {
        return [
            // Next.js static assets — long-lived cache (content-hashed, safe to cache forever)
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            // Service Worker — must never be cached so updates are picked up immediately
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        // Allow the SW to control all paths under the origin
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
            // Manifest — short cache so branding changes propagate quickly
            {
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=3600',
                    },
                ],
            },
            // 🛡️ Global Security Policy (including Maps whitelist)
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-src 'self' https://www.google.com https://maps.google.com https://www.openstreetmap.org https://www.bing.com *.bing.com;",
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
