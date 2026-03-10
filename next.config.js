const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
        {
            urlPattern: /^\/uploads\/mediashow\/.*\.(?:png|jpg|jpeg|svg|gif|mp4|webm|ogg)$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'wasla-mediashow-assets',
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
                cacheableResponse: {
                    statuses: [0, 200],
                },
            },
        },
    ],
});

const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: ['better-sqlite3']
    }
};

module.exports = withPWA(nextConfig);
