const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    // 🛠️ Enable in dev too so we can test offline behaviour without a full build
    // Set NEXT_PUBLIC_PWA_DISABLE=true in .env.local to silence it during pure UI work
    disable: process.env.NEXT_PUBLIC_PWA_DISABLE === 'true',
    register: true,
    skipWaiting: true,

    // ── Offline Fallback ──────────────────────────────────────────────────────
    // When a page is not in the cache and the network is down, the SW serves /offline
    // instead of the browser's built-in "No internet" (dinosaur) page.
    fallbacks: {
        document: '/offline',
    },

    runtimeCaching: [
        // ── 1. App Shell: JS & CSS bundles — StaleWhileRevalidate ────────────
        // Serves instantly from cache, then updates in background.
        {
            urlPattern: /\/_next\/static\/.+\.(js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'wasla-static-assets',
                expiration: {
                    maxEntries: 300,
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
        // Expanded pattern: kiosk, dashboard, leads, admin dashboard, offline fallback.
        // NetworkFirst: try network, fall back to cache within 3 s.
        {
            urlPattern: /^https?:\/\/.*\/(kiosk|dashboard|leads|admin\/dashboard|admin\/login|login|sync|offline)(\/.*)?(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'wasla-app-pages',
                expiration: {
                    maxEntries: 40,
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

        // ── 9. Web fonts — CacheFirst ────────────────────────────────────────
        {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'wasla-google-fonts',
                expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
            },
        },
    ],
});

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    transpilePackages: ['lucide-react', 'qrcode.react'],
    serverExternalPackages: ['better-sqlite3'],
    turbopack: {},
    experimental: {
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
