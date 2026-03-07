const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
});

const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverComponentsExternalPackages: ['better-sqlite3']
    }
};

module.exports = withPWA(nextConfig);
