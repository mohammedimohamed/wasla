const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
        // ── 1. App Shell: JS & CSS bundles — StaleWhileRevalidate ────────────
        // Serves instantly from cache, then updates in background.
        {
            urlPattern: /\/_next\/static\/.+\.(js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'wasla-static-assets',
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                },
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 2. Next.js images & static files ─────────────────────────────────
        {
            urlPattern: /\/_next\/image\?url=.+/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'wasla-next-images',
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 3. i18n locale JSON files — NetworkFirst with offline fallback ───
        // Locale files must be fresh but still usable when offline.
        {
            urlPattern: /\/locales\/.+\.json$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'wasla-locales',
                expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 24 * 60 * 60, // 1 day
                },
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 4. App pages (HTML) — NetworkFirst ───────────────────────────────
        // Kiosk and Commercial pages must work offline; serve stale if network unavailable.
        {
            urlPattern: /^https?:\/\/.*\/(kiosk|dashboard|leads\/new)(\/.*)?$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'wasla-app-pages',
                expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 7 * 24 * 60 * 60,
                },
                networkTimeoutSeconds: 3,
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 5. Public API endpoints for settings and form config ─────────────
        // StaleWhileRevalidate so the kiosk loads with last-known config when offline.
        {
            urlPattern: /\/api\/(settings|mediashow|form-config)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'wasla-api-config',
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60, // 1 hour
                },
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 6. Mediashow media assets — CacheFirst (large files, rarely change)
        {
            urlPattern: /\/api\/mediashow\/uploads\/mediashow\/.+\.(?:png|jpg|jpeg|svg|gif|mp4|webm|ogg)$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'wasla-mediashow-assets',
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
            },
        },

        // ── 7. Branding assets (logos, images) — CacheFirst —————————————————
        {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'wasla-branding-assets',
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: { statuses: [0, 200] },
            },
        },
        // ── 8. Icons & manifest — CacheFirst ─────────────────────────────────
        {
            urlPattern: /\/icons\/.+\.png$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'wasla-icons',
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
            },
        },
    ],
});

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    transpilePackages: ['lucide-react', 'qrcode.react'],
    experimental: {
        serverComponentsExternalPackages: ['better-sqlite3']
    },
    async rewrites() {
        return [
            {
                source: '/uploads/:path*',
                destination: '/api/mediashow/uploads/:path*',
            },
            {
                source: '/api/uploads/:path*',
                destination: '/api/mediashow/uploads/:path*',
            }
        ];
    }
};

module.exports = withPWA(nextConfig);
