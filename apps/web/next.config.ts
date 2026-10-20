import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
    /* config options here */
    distDir: process.env.LUDORA_E2E === '1' ? '.next-e2e' : '.next',
    cacheComponents: true,
    partialPrefetching: true,
    experimental: {
        globalNotFound: true,
    },
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);

